import type { DbClient } from '../db/pool.js';
import {
  getMonthBounds,
  getMonthRange,
  toISODate,
  toISODateString,
  toMonthIso,
} from '@/lib/date.js';
import { calculateBreakdown } from '@/lib/finance/calculations.js';
import type {
  CategoryRow,
  ContributionRow,
  ExpenseRow,
  ExpenseType,
  IncomeRow,
} from '@/lib/db/aliases.js';

export interface HouseholdKpis {
  totalIncome: number;
  minRequiredIncome: number;
  deficit: number;
  surplus: number;
  totalExpensePaid: number;
  totalExpensePending: number;
  totalExpenseCommitted: number;
  totalExpense: number;
  balance: number;
  balanceCommitted: number;
  savingsRate: number;
  upcomingPaymentsCount: number;
  overduePaymentsCount: number;
  minSavings: number;
  actualSavings: number;
  contributionsReceived: number;
  contributionsPending: number;
  compliancePct: number;
  unallocated: number;
  expenseByCategory: Array<{ category: string; color: string; amount: number }>;
  contributionsByMember: Array<{ userId: string; name: string; amount: number; pending: number }>;
  fixedVsVariable: { fixed: number; variable: number; debt: number; one_time: number };
  monthlyTrend: Array<{ monthIso: string; income: number; expense: number }>;
  belowSavingsTarget: boolean;
  hasDeficit: boolean;
  projectedIncome: number;
  projectedExpense: number;
  projectedBalance: number;
}

export async function fetchHouseholdKpis(
  client: DbClient,
  householdId: string,
  referenceDate?: Date,
): Promise<HouseholdKpis> {
  const ref = referenceDate ?? new Date();
  const { start, end } = getMonthBounds(ref);
  const startIso = toISODate(start);
  const endIso = toISODate(end);
  const todayIso = toISODate(ref);
  const upcomingHorizon = toISODate(new Date(ref.getTime() + 7 * 24 * 60 * 60 * 1000));
  const trendStart = toISODate(getMonthRange(11, 0, ref)[0]!);

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
    client.query(
      `SELECT user_id, amount, currency, date, category_id FROM public.incomes
       WHERE household_id = $1 AND date >= $2 AND date <= $3`,
      [householdId, startIso, endIso],
    ),
    client.query(
      `SELECT id, amount, category_id, type, status, date, due_date FROM public.expenses
       WHERE household_id = $1 AND date >= $2 AND date <= $3`,
      [householdId, startIso, endIso],
    ),
    client.query(
      `SELECT user_id, amount, status, expected_date, received_date FROM public.contributions
       WHERE household_id = $1 AND expected_date >= $2 AND expected_date <= $3`,
      [householdId, startIso, endIso],
    ),
    client.query(
      `SELECT id, name, color, type, monthly_budget FROM public.categories
       WHERE household_id = $1`,
      [householdId],
    ),
    client.query(
      `SELECT amount, date FROM public.incomes
       WHERE household_id = $1 AND date >= $2`,
      [householdId, trendStart],
    ),
    client.query(
      `SELECT amount, date, status FROM public.expenses
       WHERE household_id = $1 AND date >= $2`,
      [householdId, trendStart],
    ),
    client.query(
      `SELECT id FROM public.expenses
       WHERE household_id = $1 AND status = 'pending' AND due_date < $2`,
      [householdId, todayIso],
    ),
    client.query(
      `SELECT id FROM public.expenses
       WHERE household_id = $1 AND status = 'pending'
         AND due_date >= $2 AND due_date <= $3`,
      [householdId, todayIso, upcomingHorizon],
    ),
  ]);

  const incomes = incomesMonth.rows as Array<
    Pick<IncomeRow, 'user_id' | 'amount' | 'currency' | 'date'>
  >;
  const totalIncome = sumAmount(incomes);

  const expenses = expensesMonth.rows as Array<
    Pick<ExpenseRow, 'id' | 'amount' | 'category_id' | 'type' | 'status' | 'date'>
  >;

  const isPaid = (e: Pick<ExpenseRow, 'status'>) => e.status === 'paid';
  const isPending = (e: Pick<ExpenseRow, 'status'>) =>
    e.status === 'pending' || e.status === 'overdue';

  const expensesPaid = expenses.filter(isPaid);
  const expensesPending = expenses.filter(isPending);

  const totalExpensePaid = sumAmount(expensesPaid);
  const totalExpensePending = sumAmount(expensesPending);
  const totalExpenseCommitted = sumAmount(expenses);

  const fixedVsVariable = {
    fixed: sumAmountWhere(expensesPaid, (e) => e.type === 'fixed'),
    variable: sumAmountWhere(expensesPaid, (e) => e.type === 'variable'),
    debt: sumAmountWhere(expensesPaid, (e) => e.type === 'debt'),
    one_time: sumAmountWhere(expensesPaid, (e) => e.type === 'one_time'),
  };

  const fixedVsVariableCommitted = {
    fixed: sumAmountWhere(expenses, (e) => e.type === 'fixed'),
    variable: sumAmountWhere(expenses, (e) => e.type === 'variable'),
    debt: sumAmountWhere(expenses, (e) => e.type === 'debt'),
    one_time: sumAmountWhere(expenses, (e) => e.type === 'one_time'),
  };

  const categories = categoriesAll.rows as CategoryRow[];
  const expenseByCategory = buildByCategory(expensesPaid, categories);

  const contributions = contributionsMonth.rows as ContributionRow[];
  const contributionsReceived = sumAmountWhere(contributions, (c) => c.status === 'received');
  const contributionsPending = sumAmountWhere(contributions, (c) => c.status !== 'received');
  const contributionsByMember = aggregateByMember(contributions);
  const compliancePct = computeCompliance(expenses, categories);

  const totalBudget = categories
    .filter((c) => c.type === 'expense')
    .reduce((acc, c) => acc + (c.monthly_budget ? Number(c.monthly_budget) : 0), 0);
  const unallocated = Math.max(totalIncome - totalBudget, 0);

  const breakdown = calculateBreakdown({
    totalIncome,
    fixedExpenses: fixedVsVariableCommitted.fixed,
    variableExpenses: fixedVsVariableCommitted.variable,
    debts: fixedVsVariableCommitted.debt,
    scheduledExpenses: fixedVsVariableCommitted.one_time,
  });

  const balanceCash = totalIncome - totalExpensePaid;
  const expensesTrendRows = expensesTrend.rows as Pick<
    ExpenseRow,
    'amount' | 'date' | 'status'
  >[];
  const monthlyTrend = buildMonthlyTrend(
    incomesTrend.rows as Pick<IncomeRow, 'amount' | 'date'>[],
    expensesTrendRows.filter((e) => e.status === 'paid'),
    ref,
  );

  const projection = projectMonth(
    breakdown,
    totalIncome,
    totalExpenseCommitted,
    monthlyTrend,
  );

  return {
    totalIncome,
    minRequiredIncome: breakdown.minRequiredIncome,
    deficit: breakdown.deficit,
    surplus: breakdown.surplus,
    totalExpensePaid,
    totalExpensePending,
    totalExpenseCommitted,
    totalExpense: totalExpenseCommitted,
    balance: balanceCash,
    balanceCommitted: breakdown.balance,
    savingsRate: breakdown.savingsRate,
    upcomingPaymentsCount: upcomingExpenses.rows.length,
    overduePaymentsCount: overdueExpenses.rows.length,
    minSavings: breakdown.minSavings,
    actualSavings: breakdown.actualSavings,
    contributionsReceived,
    contributionsPending,
    compliancePct,
    unallocated,
    expenseByCategory,
    contributionsByMember: contributionsByMember.map((row) => ({
      userId: row.userId,
      name: row.userId,
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
}

function sumAmount(rows: Array<{ amount: number | string }>): number {
  return rows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
}

function sumAmountWhere<T extends { amount: number | string }>(
  rows: T[],
  pred: (t: T) => boolean,
): number {
  return rows.filter(pred).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
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
  incomes: Array<{ amount: number | string; date: Date | string }>,
  expenses: Array<{ amount: number | string; date: Date | string }>,
  reference: Date,
): Array<{ monthIso: string; income: number; expense: number }> {
  const months = getMonthRange(11, 0, reference);
  const init = new Map(
    months.map((m) => {
      const key = toMonthIso(m);
      return [key, { monthIso: key, income: 0, expense: 0 }];
    }),
  );
  for (const i of incomes) {
    const key = toISODateString(i.date).slice(0, 7);
    const row = init.get(key);
    if (row) row.income += Number(i.amount);
  }
  for (const e of expenses) {
    const key = toISODateString(e.date).slice(0, 7);
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
  const recent = trend.slice(-3);
  const avgExpense =
    recent.length > 0 ? recent.reduce((a, r) => a + r.expense, 0) / recent.length : 0;
  const projectedExpense = Math.max(expense, avgExpense);
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

export type { ExpenseType };
