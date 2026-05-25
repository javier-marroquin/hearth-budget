import { describe, expect, it } from 'vitest';
import { splitExpense } from '@/lib/finance/splits';

describe('splitExpense — equal', () => {
  it('divides amount evenly between participants', () => {
    const r = splitExpense(100, [{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }], 'equal');
    expect(r).toHaveLength(3);
    expect(r.reduce((acc, x) => acc + x.amount, 0)).toBe(100);
    // First two equal, last absorbs the remainder
    expect(r[0]?.amount).toBeCloseTo(33.33, 2);
    expect(r[1]?.amount).toBeCloseTo(33.33, 2);
    expect(r[2]?.amount).toBeCloseTo(33.34, 2);
  });

  it('returns empty for no participants', () => {
    expect(splitExpense(100, [], 'equal')).toEqual([]);
  });

  it('returns 0 for each participant when total is 0', () => {
    const r = splitExpense(0, [{ userId: 'a' }, { userId: 'b' }], 'equal');
    expect(r.every((x) => x.amount === 0)).toBe(true);
  });
});

describe('splitExpense — percentage', () => {
  it('respects the configured percentages', () => {
    const r = splitExpense(
      1000,
      [
        { userId: 'a', percentage: 70 },
        { userId: 'b', percentage: 30 },
      ],
      'percentage',
    );
    expect(r[0]?.amount).toBe(700);
    expect(r[1]?.amount).toBe(300);
    expect(r.reduce((acc, x) => acc + x.amount, 0)).toBe(1000);
  });

  it('falls back to equal split if all percentages are zero', () => {
    const r = splitExpense(
      100,
      [
        { userId: 'a', percentage: 0 },
        { userId: 'b', percentage: 0 },
      ],
      'percentage',
    );
    expect(r[0]?.amount).toBe(50);
    expect(r[1]?.amount).toBe(50);
  });
});

describe('splitExpense — income_based', () => {
  it('weights by reported income', () => {
    const r = splitExpense(
      900,
      [
        { userId: 'a', income: 2000 },
        { userId: 'b', income: 1000 },
      ],
      'income_based',
    );
    expect(r[0]?.amount).toBe(600);
    expect(r[1]?.amount).toBe(300);
  });
});

describe('splitExpense — custom', () => {
  it('scales custom amounts so they sum to total', () => {
    const r = splitExpense(
      120,
      [
        { userId: 'a', amount: 100 },
        { userId: 'b', amount: 100 },
      ],
      'custom',
    );
    // Both wanted 100 → scaled to 60 each
    expect(r.reduce((acc, x) => acc + x.amount, 0)).toBe(120);
  });
});
