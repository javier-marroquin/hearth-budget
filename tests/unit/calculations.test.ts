import { describe, expect, it } from 'vitest';
import { calculateBreakdown, categoryCompliance, overallCompliance } from '@/lib/finance/calculations';

describe('calculateBreakdown', () => {
  it('computes the canonical formulas for a healthy household', () => {
    const r = calculateBreakdown({
      totalIncome: 3_000_000,
      fixedExpenses: 1_500_000,
      variableExpenses: 500_000,
      debts: 0,
      scheduledExpenses: 0,
    });
    expect(r.totalIncome).toBe(3_000_000);
    expect(r.totalExpense).toBe(2_000_000);
    expect(r.balance).toBe(1_000_000);
    expect(r.actualSavings).toBe(1_000_000);
    expect(r.minSavings).toBeCloseTo(300_000, 0);
    // 2,000,000 / 0.90 = 2,222,222.22
    expect(r.minRequiredIncome).toBeCloseTo(2_222_222.22, 1);
    expect(r.surplus).toBeCloseTo(777_777.78, 1);
    expect(r.deficit).toBe(0);
    expect(r.savingsRate).toBeCloseTo(1 / 3, 4);
    expect(r.hasDeficit).toBe(false);
    expect(r.belowSavingsTarget).toBe(false);
  });

  it('flags a deficit when income < min required', () => {
    const r = calculateBreakdown({
      totalIncome: 2_000_000,
      fixedExpenses: 2_000_000,
      variableExpenses: 200_000,
      debts: 0,
      scheduledExpenses: 0,
    });
    // total expense = 2.2M  → min required = 2.4444M → deficit ≈ 444K
    expect(r.totalExpense).toBe(2_200_000);
    expect(r.minRequiredIncome).toBeCloseTo(2_444_444.44, 1);
    expect(r.deficit).toBeCloseTo(444_444.44, 1);
    expect(r.hasDeficit).toBe(true);
    expect(r.balance).toBeLessThan(0);
    expect(r.actualSavings).toBe(0);
  });

  it('flags below-savings-target when rate < 10%', () => {
    const r = calculateBreakdown({
      totalIncome: 1_000_000,
      fixedExpenses: 950_000,
      variableExpenses: 0,
      debts: 0,
      scheduledExpenses: 0,
    });
    expect(r.savingsRate).toBeCloseTo(0.05, 2);
    expect(r.belowSavingsTarget).toBe(true);
  });

  it('handles zero income gracefully', () => {
    const r = calculateBreakdown({
      totalIncome: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      debts: 0,
      scheduledExpenses: 0,
    });
    expect(r.savingsRate).toBe(0);
    expect(r.deficit).toBe(0);
    expect(r.surplus).toBe(0);
  });

  it('ignores negative input by clamping to zero', () => {
    const r = calculateBreakdown({
      totalIncome: -100,
      fixedExpenses: 100,
      variableExpenses: 0,
      debts: 0,
      scheduledExpenses: 0,
    });
    expect(r.totalIncome).toBe(0);
    expect(r.savingsRate).toBe(0);
  });
});

describe('categoryCompliance', () => {
  it('reports under/on_track/over status', () => {
    expect(categoryCompliance(50, 100).status).toBe('under');
    expect(categoryCompliance(95, 100).status).toBe('on_track');
    expect(categoryCompliance(120, 100).status).toBe('over');
    expect(categoryCompliance(50, null).status).toBe('no_budget');
  });
  it('returns the remaining budget for under cases', () => {
    expect(categoryCompliance(40, 100).remaining).toBe(60);
    expect(categoryCompliance(120, 100).remaining).toBe(0);
  });
});

describe('overallCompliance', () => {
  it('returns 0 when there is no budget', () => {
    expect(overallCompliance([{ spent: 100, budget: null }])).toBe(0);
  });
  it('caps at 2 (200%)', () => {
    expect(
      overallCompliance([
        { spent: 1000, budget: 100 },
      ]),
    ).toBe(2);
  });
});
