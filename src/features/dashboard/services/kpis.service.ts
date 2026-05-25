import { supabase } from '@/lib/supabase/client';
import { getMonthBounds, getMonthRange, toISODate } from '@/lib/date';
import { calculateBreakdown } from '@/lib/finance/calculations';
import type {
  CategoryRow,
  ExpenseRow,
  IncomeRow,
  ContributionRow,
  ExpenseType,
} from '@/lib/supabase/aliases';

export interface HouseholdKpis {
  // Hero
  totalIncome: number;
  minRequiredIncome: number;
  deficit: number;
  surplus: number;
  // Primary KPIs (5)
  totalExpense: number;
  balance: number;
  savingsRate: number;
  upcomingPaymentsCount: number;
  overduePaymentsCount: number;
  // Secondary KPIs
  minSavings: number;
  actualSavings: number;
  contributionsReceived: number;
  contributionsPending: number;
  compliancePct: number;
  unallocated: number;
  // Aggregates for charts
  expenseByCategory: Array<{ category: string; color: string; amount: number }>;
  contributionsByMember: Array<{ userId: string; name: string; amount: number; pending: number }>;
  fixedVsVariable: { fixed: number; variable: number; debt: number; one_time: number };
  // Trend (12 months)
  monthlyTrend: Array<{ monthIso: string; income: number; expense: number }>;
  // Flags
  belowSavingsTarget: boolean;
  hasDeficit: boolean;
  // Projection
  projectedIncome: number;
  projectedExpense: number;
  projectedBalance: number;
}

interface FetchKpisInput {
  householdId: string;
  referenceDate?: Date;
}

/**
 * Aggregate all the dashboard numbers in a single function so we have one
 * source of truth and we can cache the whole thing in React Query.
 */
export async function fetchHouseholdKpis(
  input: FetchKpisInput,
): Promise<HouseholdKpis> {
  const ref = input.referenceDate ?? new Date();
  const { start, end } = getMonthBounds(ref);
  const startIso = toISODate(start);
  const endIso = toISODate(end);
  const todayIso = toISODate(ref);
  const upcomingHorizon = toISODate(new Date(ref.getTime() + 7 * 24 * 60 * 60 * 1000));

  // Parallel fetch of all entities for current month + 12 month history.
  const trendStart = toISODate(getMonthRange(11)[0]!);

  const [
    incomesMonth,
    expensesMonth,
    contributionsMonth,
    categoriesAll,
    incomesTrend,
    expensesTrend,
    overdueExpenses,
    upcomingExpenses,
  ] = await Promise.all([
    supabase
      .from('incomes')
      .select('user_id, amount, currency, date, category_id')
      .eq('household_id', input.householdId)
      .gte('date', startIso)
      .lte('date', endIso),
    supabase
      .from('expenses')
      .select('id, amount, category_id, type, status, date, due_date')
      .eq('household_id', input.householdId)
      .gte('date', startIso)
      .lte('date', endIso),
    supabase
      .from('contributions')
      .select('user_id, amount, status, expected_date, received_date')
      .eq('household_id', input.householdId)
      .gte('expected_date', startIso)
      .lte('expected_date', endIso),
    supabase
      .from('categories')
      .select('id, name, color, type, monthly_budget')
      .eq('household_id', input.householdId),
    supabase
      .from('incomes')
      .select('amount, date')
      .eq('household_id', input.householdId)
      .gte('date', trendStart),
    supabase
      .from('expenses')
      .select('amount, date')
      .eq('household_id', input.householdId)
      .gte('date', trendStart),
    supabase
      .from('expenses')
      .select('id')
      .eq('household_id', input.householdId)
      .eq('status', 'pending')
      .lt('due_date', todayIso),
    supabase
      .from('expenses')
      .select('id')
      .eq('household_id', input.householdId)
      .eq('status', 'pending')
      .gte('due_date', todayIso)
      .lte('due_date', upcomingHorizon),
  ]);

  // Income aggregates ---------------------------------------------------------
  const incomes: Array<Pick<IncomeRow, 'user_id' | 'amount' | 'currency' | 'date'>> =
    incomesMonth.data ?? [];
  const totalIncome = sumAmount(incomes);

  // Expense aggregates --------------------------------------------------------
  const expenses: Array<
    Pick<ExpenseRow, 'id' | 'amount' | 'category_id' | 'type' | 'status' | 'date'>
  > = (expensesMonth.data as ExpenseRow[]) ?? [];
  const totalExpense = sumAmount(expenses);

  const fixedVsVariable = {
    fixed: sumAmountWhere(expenses, (e) => e.type === 'fixed'),
    variable: sumAmountWhere(expenses, (e) => e.type === 'variable'),
    debt: sumAmountWhere(expenses, (e) => e.type === 'debt'),
    one_time: sumAmountWhere(expenses, (e) => e.type === 'one_time'),
  };

  // By category --------------------------------------------------------------
  const categories: CategoryRow[] = (categoriesAll.data as CategoryRow[]) ?? [];
  const expenseByCategory = buildByCategory(expenses, categories);

  // Contributions ------------------------------------------------------------
  const contributions: ContributionRow[] =
    (contributionsMonth.data as ContributionRow[]) ?? [];
  const contributionsReceived = sumAmountWhere(
    contributions,
    (c) => c.status === 'received',
  );
  const contributionsPending = sumAmountWhere(
    contributions,
    (c) => c.status !== 'received',
  );

  const contributionsByMember = aggregateByMember(contributions);

  // Compliance ---------------------------------------------------------------
  const compliancePct = computeCompliance(expenses, categories);

  // Unallocated (envelope mode) ----------------------------------------------
  const totalBudget = categories
    .filter((c) => c.type === 'expense')
    .reduce((acc, c) => acc + (c.monthly_budget ? Number(c.monthly_budget) : 0), 0);
  const unallocated = Math.max(totalIncome - totalBudget, 0);

  // Core breakdown -----------------------------------------------------------
  const breakdown = calculateBreakdown({
    totalIncome,
    fixedExpenses: fixedVsVariable.fixed,
    variableExpenses: fixedVsVariable.variable,
    debts: fixedVsVariable.debt,
    scheduledExpenses: fixedVsVariable.one_time,
  });

  // Trend 12 months ----------------------------------------------------------
  const monthlyTrend = buildMonthlyTrend(
    (incomesTrend.data as Pick<IncomeRow, 'amount' | 'date'>[]) ?? [],
    (expensesTrend.data as Pick<ExpenseRow, 'amount' | 'date'>[]) ?? [],
  );

  // Projection ---------------------------------------------------------------
  const projection = projectMonth(breakdown, totalIncome, totalExpense, monthlyTrend);

  return {
    totalIncome,
    minRequiredIncome: breakdown.minRequiredIncome,
    deficit: breakdown.deficit,
    surplus: breakdown.surplus,
    totalExpense,
    balance: breakdown.balance,
    savingsRate: breakdown.savingsRate,
    upcomingPaymentsCount: upcomingExpenses.data?.length ?? 0,
    overduePaymentsCount: overdueExpenses.data?.length ?? 0,
    minSavings: breakdown.minSavings,
    actualSavings: breakdown.actualSavings,
    contributionsReceived,
    contributionsPending,
    compliancePct,
    unallocated,
    expenseByCategory,
    contributionsByMember: contributionsByMember.map((row) => ({
      userId: row.userId,
      name: row.userId, // resolved by caller via members map
      amount: row.amount,
      pending: row.pending,
    })),
    fixedVsVariable,
    monthlyTrend,
    belowSavingsTarget: breakdown.belowSavingsTarget,
    hasDeficit: breakdown.hasDeficit,
    projectedIncome: projection.projectedIncome,
    projectedExpense: projection.projectedExpense,
    projectedBalance: projection.projectedBalance,
  };

  // Helpers ------------------------------------------------------------------
  function sumAmount(rows: Array<{ amount: number | string }>): number {
    return rows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
  }
  function sumAmountWhere<T extends { amount: number | string }>(
    rows: T[],
    pred: (t: T) => boolean,
  ): number {
    return rows.filter(pred).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
  }
}

function buildByCategory(
  expenses: Array<Pick<ExpenseRow, 'amount' | 'category_id'>>,
  categories: CategoryRow[],
) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const acc = new Map<string, { category: string; color: string; amount: number }>();
  for (const e of expenses) {
    const cat = e.category_id ? byId.get(e.category_id) : null;
    const key = cat?.id ?? '__none__';
    const name = cat?.name ?? 'Sin categoría';
    const color = cat?.color ?? '#94a3b8';
    const prev = acc.get(key) ?? { category: name, color, amount: 0 };
    prev.amount += Number(e.amount);
    acc.set(key, prev);
  }
  return Array.from(acc.values()).sort((a, b) => b.amount - a.amount);
}

function aggregateByMember(contributions: ContributionRow[]) {
  const acc = new Map<string, { userId: string; amount: number; pending: number }>();
  for (const c of contributions) {
    const prev = acc.get(c.user_id) ?? { userId: c.user_id, amount: 0, pending: 0 };
    if (c.status === 'received') prev.amount += Number(c.amount);
    else prev.pending += Number(c.amount);
    acc.set(c.user_id, prev);
  }
  return Array.from(acc.values());
}

function computeCompliance(
  expenses: Array<Pick<ExpenseRow, 'amount' | 'category_id'>>,
  categories: CategoryRow[],
): number {
  const expenseCats = categories.filter((c) => c.type === 'expense' && c.monthly_budget);
  if (expenseCats.length === 0) return 0;
  const byCat = new Map<string, number>();
  for (const e of expenses) {
    if (!e.category_id) continue;
    byCat.set(e.category_id, (byCat.get(e.category_id) ?? 0) + Number(e.amount));
  }
  const totalBudget = expenseCats.reduce((a, c) => a + Number(c.monthly_budget ?? 0), 0);
  const totalSpent = expenseCats.reduce((a, c) => a + (byCat.get(c.id) ?? 0), 0);
  if (totalBudget <= 0) return 0;
  return Math.min(totalSpent / totalBudget, 2);
}

function buildMonthlyTrend(
  incomes: Array<{ amount: number | string; date: string }>,
  expenses: Array<{ amount: number | string; date: string }>,
): Array<{ monthIso: string; income: number; expense: number }> {
  const months = getMonthRange(11);
  const init = new Map(
    months.map((m) => [
      m.toISOString().slice(0, 7),
      { monthIso: m.toISOString().slice(0, 7), income: 0, expense: 0 },
    ]),
  );
  for (const i of incomes) {
    const key = i.date.slice(0, 7);
    const row = init.get(key);
    if (row) row.income += Number(i.amount);
  }
  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    const row = init.get(key);
    if (row) row.expense += Number(e.amount);
  }
  return Array.from(init.values());
}

function projectMonth(
  breakdown: ReturnType<typeof calculateBreakdown>,
  income: number,
  expense: number,
  trend: Array<{ monthIso: string; income: number; expense: number }>,
) {
  // Simple projection: take the average of last 3 months for variability.
  const recent = trend.slice(-3);
  const avgExpense =
    recent.length > 0 ? recent.reduce((a, r) => a + r.expense, 0) / recent.length : 0;
  const projectedExpense = Math.max(expense, avgExpense);
  // Income projection: use larger of MTD and average.
  const avgIncome =
    recent.length > 0 ? recent.reduce((a, r) => a + r.income, 0) / recent.length : 0;
  const projectedIncome = Math.max(income, avgIncome);
  return {
    projectedIncome,
    projectedExpense,
    projectedBalance: projectedIncome - projectedExpense,
    breakdown,
  };
}

export { ExpenseType };
