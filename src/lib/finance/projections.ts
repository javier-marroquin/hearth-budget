/**
 * Project the month-end financial position by combining:
 *   - confirmed (already booked) amounts
 *   - scheduled recurrences that fall within the remaining days
 *   - a moving average of past variable expenses (for months without
 *     fixed-amount tracking)
 */

import type { FinancialBreakdown } from './calculations';

export interface MonthSnapshot {
  monthStart: Date;
  monthEnd: Date;
  /** Income already received this month. */
  confirmedIncome: number;
  /** Income expected by month-end (e.g. salary still to land). */
  expectedIncome: number;
  /** Expenses already paid + variable so far. */
  confirmedExpense: number;
  /** Future scheduled outflows within the month. */
  scheduledExpense: number;
  /** Historical avg of un-tracked variable expense (3-month moving). */
  averageVariableExpense?: number;
}

export interface MonthProjection extends FinancialBreakdown {
  /** Projected total income (confirmed + expected). */
  projectedIncome: number;
  /** Projected total expense (confirmed + scheduled + avg variable). */
  projectedExpense: number;
  /** Projected balance at month end. */
  projectedBalance: number;
}

/**
 * Combine a snapshot into a projected breakdown.
 */
export function projectMonthEnd(
  snapshot: MonthSnapshot,
  calc: (input: {
    totalIncome: number;
    fixedExpenses: number;
    variableExpenses: number;
    debts: number;
    scheduledExpenses: number;
  }) => FinancialBreakdown,
): MonthProjection {
  const projectedIncome = snapshot.confirmedIncome + snapshot.expectedIncome;
  const variable =
    snapshot.confirmedExpense + (snapshot.averageVariableExpense ?? 0);
  const projectedExpense = variable + snapshot.scheduledExpense;

  const breakdown = calc({
    totalIncome: projectedIncome,
    fixedExpenses: 0,
    variableExpenses: variable,
    debts: 0,
    scheduledExpenses: snapshot.scheduledExpense,
  });

  return {
    ...breakdown,
    projectedIncome,
    projectedExpense,
    projectedBalance: projectedIncome - projectedExpense,
  };
}
