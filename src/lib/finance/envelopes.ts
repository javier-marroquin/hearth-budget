/**
 * Envelope budgeting helpers (zero-sum).
 *
 * Given the household's income and a list of category budgets:
 *  - how much has been allocated total
 *  - how much remains unassigned
 *  - per-category remaining + over/under status
 */

export interface EnvelopeCategory {
  id: string;
  name: string;
  color: string;
  monthlyBudget: number;
  rolloverEnabled: boolean;
  /** spent so far this month */
  spent: number;
  /** balance carried over from previous month (positive = surplus, negative = deficit) */
  rolloverIn?: number;
}

export interface EnvelopeStatus {
  category: EnvelopeCategory;
  /** effective budget for this period (budget + rollover) */
  effectiveBudget: number;
  /** budget - spent (can be negative) */
  remaining: number;
  /** spent / effectiveBudget (capped at 2 for UI sanity) */
  utilizationRatio: number;
  status: 'safe' | 'warning' | 'over';
}

export interface EnvelopeSummary {
  totalIncome: number;
  totalAllocated: number;
  unallocated: number;
  totalSpent: number;
  buckets: EnvelopeStatus[];
}

export function buildEnvelopeSummary(
  totalIncome: number,
  categories: EnvelopeCategory[],
): EnvelopeSummary {
  const buckets: EnvelopeStatus[] = categories.map((c) => {
    const effectiveBudget = c.monthlyBudget + (c.rolloverIn ?? 0);
    const remaining = effectiveBudget - c.spent;
    const utilizationRatio =
      effectiveBudget > 0 ? Math.min(c.spent / effectiveBudget, 2) : 0;
    let status: EnvelopeStatus['status'] = 'safe';
    if (utilizationRatio > 1) status = 'over';
    else if (utilizationRatio > 0.85) status = 'warning';
    return {
      category: c,
      effectiveBudget,
      remaining,
      utilizationRatio,
      status,
    };
  });

  const totalAllocated = categories.reduce((a, c) => a + c.monthlyBudget, 0);
  const totalSpent = categories.reduce((a, c) => a + c.spent, 0);
  const unallocated = Math.max(totalIncome - totalAllocated, 0);

  return {
    totalIncome,
    totalAllocated,
    unallocated,
    totalSpent,
    buckets: buckets.sort((a, b) => b.category.monthlyBudget - a.category.monthlyBudget),
  };
}

/**
 * Apply rollover from previous month to current month's effective budget.
 */
export function applyRollover(
  budget: number,
  previousRemaining: number,
  rolloverEnabled: boolean,
): { effectiveBudget: number; carryIn: number } {
  if (!rolloverEnabled) return { effectiveBudget: budget, carryIn: 0 };
  return {
    effectiveBudget: budget + previousRemaining,
    carryIn: previousRemaining,
  };
}
