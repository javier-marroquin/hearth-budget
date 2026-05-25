/**
 * Pure financial calculations.
 *
 * The single source of truth for the formulas the dashboard exposes.
 * All inputs are plain numbers — no DB calls, no React. This makes the
 * module trivially testable and reusable on the server too.
 */

export const MIN_SAVINGS_RATE = 0.1; // 10 %

export interface FinancialBreakdownInput {
  totalIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  debts: number;
  scheduledExpenses: number;
}

export interface FinancialBreakdown {
  /** Total income for the period. */
  totalIncome: number;
  /** Sum of all expense buckets. */
  totalExpense: number;
  /** Recommended minimum monthly savings: 10 % of income. */
  minSavings: number;
  /** Income required to cover expenses and still save 10 %. */
  minRequiredIncome: number;
  /** income - expense (can be negative). */
  balance: number;
  /** max(balance, 0) — what's actually being saved. */
  actualSavings: number;
  /** actualSavings / totalIncome — between 0 and 1. */
  savingsRate: number;
  /** max(minRequiredIncome - totalIncome, 0). */
  deficit: number;
  /** max(totalIncome - minRequiredIncome, 0). */
  surplus: number;
  /** True when savings rate is below the 10 % target. */
  belowSavingsTarget: boolean;
  /** True when income is below the required minimum. */
  hasDeficit: boolean;
}

/**
 * Run the canonical household finance formulas.
 *
 * Formulas (per spec):
 *   minSavings           = totalIncome * 0.10
 *   totalExpense         = fixed + variable + debts + scheduled
 *   minRequiredIncome    = totalExpense / 0.90
 *   balance              = totalIncome - totalExpense
 *   actualSavings        = max(balance, 0)
 *   savingsRate          = actualSavings / totalIncome
 *   deficit              = max(minRequiredIncome - totalIncome, 0)
 */
export function calculateBreakdown(
  input: FinancialBreakdownInput,
): FinancialBreakdown {
  const totalIncome = nonNegative(input.totalIncome);
  const totalExpense =
    nonNegative(input.fixedExpenses) +
    nonNegative(input.variableExpenses) +
    nonNegative(input.debts) +
    nonNegative(input.scheduledExpenses);

  const minSavings = totalIncome * MIN_SAVINGS_RATE;
  const minRequiredIncome = totalExpense / (1 - MIN_SAVINGS_RATE);
  const balance = totalIncome - totalExpense;
  const actualSavings = Math.max(balance, 0);
  const savingsRate = totalIncome > 0 ? actualSavings / totalIncome : 0;
  const deficit = Math.max(minRequiredIncome - totalIncome, 0);
  const surplus = Math.max(totalIncome - minRequiredIncome, 0);

  return {
    totalIncome,
    totalExpense,
    minSavings,
    minRequiredIncome,
    balance,
    actualSavings,
    savingsRate,
    deficit,
    surplus,
    belowSavingsTarget: savingsRate < MIN_SAVINGS_RATE,
    hasDeficit: deficit > 0,
  };
}

/**
 * Budget compliance per category.
 * Returns a ratio 0..∞ where 1 = exactly on budget, <1 under, >1 over.
 */
export function categoryCompliance(spent: number, budget: number | null): {
  ratio: number;
  status: 'under' | 'on_track' | 'over' | 'no_budget';
  remaining: number;
} {
  if (!budget || budget <= 0) {
    return { ratio: 0, status: 'no_budget', remaining: 0 };
  }
  const ratio = spent / budget;
  const remaining = Math.max(budget - spent, 0);
  let status: 'under' | 'on_track' | 'over';
  if (ratio > 1) status = 'over';
  else if (ratio > 0.9) status = 'on_track';
  else status = 'under';
  return { ratio, status, remaining };
}

/** Aggregate compliance across an array of {spent, budget} category buckets. */
export function overallCompliance(
  buckets: Array<{ spent: number; budget: number | null }>,
): number {
  const totalBudget = buckets.reduce((acc, b) => acc + (b.budget ?? 0), 0);
  const totalSpent = buckets.reduce((acc, b) => acc + b.spent, 0);
  if (totalBudget <= 0) return 0;
  return Math.min(totalSpent / totalBudget, 2); // cap at 200 % for display
}

function nonNegative(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(n, 0);
}
