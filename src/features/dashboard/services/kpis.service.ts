import { apiFetch } from '@/lib/api/client';
import { toISODate } from '@/lib/date';
import type { ExpenseType } from '@/lib/db/aliases';

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

interface FetchKpisInput {
  householdId: string;
  referenceDate?: Date;
}

export async function fetchHouseholdKpis(
  input: FetchKpisInput,
): Promise<HouseholdKpis> {
  const ref = input.referenceDate ?? new Date();
  const qs = new URLSearchParams({ referenceDate: toISODate(ref) });
  return apiFetch(`/api/households/${input.householdId}/kpis?${qs.toString()}`);
}

export { ExpenseType };
