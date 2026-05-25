import { describe, expect, it } from 'vitest';
import { applyRollover, buildEnvelopeSummary } from '@/lib/finance/envelopes';

describe('buildEnvelopeSummary', () => {
  it('classifies under/warning/over per bucket', () => {
    const s = buildEnvelopeSummary(1_000_000, [
      {
        id: 'a',
        name: 'Vivienda',
        color: '#000',
        monthlyBudget: 500_000,
        rolloverEnabled: false,
        spent: 100_000,
      },
      {
        id: 'b',
        name: 'Comida',
        color: '#000',
        monthlyBudget: 300_000,
        rolloverEnabled: false,
        spent: 280_000,
      },
      {
        id: 'c',
        name: 'Otros',
        color: '#000',
        monthlyBudget: 100_000,
        rolloverEnabled: false,
        spent: 150_000,
      },
    ]);

    expect(s.totalAllocated).toBe(900_000);
    expect(s.totalSpent).toBe(530_000);
    expect(s.unallocated).toBe(100_000);

    const buckets = Object.fromEntries(s.buckets.map((b) => [b.category.id, b]));
    expect(buckets.a?.status).toBe('safe');
    expect(buckets.b?.status).toBe('warning');
    expect(buckets.c?.status).toBe('over');
  });

  it('clamps utilizationRatio at 2 for sanity', () => {
    const s = buildEnvelopeSummary(0, [
      {
        id: 'x',
        name: 'X',
        color: '#000',
        monthlyBudget: 10,
        rolloverEnabled: false,
        spent: 1000,
      },
    ]);
    expect(s.buckets[0]?.utilizationRatio).toBe(2);
  });

  it('respects rollover_in when computing remaining', () => {
    const s = buildEnvelopeSummary(0, [
      {
        id: 'x',
        name: 'X',
        color: '#000',
        monthlyBudget: 100,
        rolloverEnabled: true,
        rolloverIn: 50,
        spent: 120,
      },
    ]);
    expect(s.buckets[0]?.effectiveBudget).toBe(150);
    expect(s.buckets[0]?.remaining).toBe(30);
  });
});

describe('applyRollover', () => {
  it('passes through the budget when rollover is off', () => {
    expect(applyRollover(100, 50, false)).toEqual({ effectiveBudget: 100, carryIn: 0 });
  });
  it('adds the previous remaining (positive or negative) when on', () => {
    expect(applyRollover(100, 50, true)).toEqual({ effectiveBudget: 150, carryIn: 50 });
    expect(applyRollover(100, -30, true)).toEqual({ effectiveBudget: 70, carryIn: -30 });
  });
});
