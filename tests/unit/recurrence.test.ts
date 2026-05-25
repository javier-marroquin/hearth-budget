import { describe, expect, it } from 'vitest';
import {
  monthlyGoalTarget,
  nextOccurrences,
  isOccurrence,
} from '@/lib/finance/recurrence';

/** Local YYYY-MM-DD (avoids timezone drift in assertions). */
function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('nextOccurrences — monthly', () => {
  it('returns the requested number of upcoming occurrences', () => {
    const dates = nextOccurrences(
      {
        frequency: 'monthly',
        interval: 1,
        start_date: '2026-01-15',
      },
      3,
      new Date(2026, 0, 1),
    );
    expect(dates).toHaveLength(3);
    expect(localISO(dates[0]!)).toBe('2026-01-15');
    expect(localISO(dates[1]!)).toBe('2026-02-15');
    expect(localISO(dates[2]!)).toBe('2026-03-15');
  });

  it('respects end_date', () => {
    const dates = nextOccurrences(
      {
        frequency: 'monthly',
        interval: 1,
        start_date: '2026-01-15',
        end_date: '2026-02-28',
      },
      5,
      new Date(2026, 0, 1),
    );
    expect(dates).toHaveLength(2);
  });

  it('respects occurrences cap', () => {
    const dates = nextOccurrences(
      {
        frequency: 'monthly',
        interval: 1,
        start_date: '2026-01-15',
        occurrences: 2,
      },
      10,
      new Date(2026, 0, 1),
    );
    expect(dates).toHaveLength(2);
  });
});

describe('nextOccurrences — weekly', () => {
  it('moves 7 days at a time', () => {
    const dates = nextOccurrences(
      { frequency: 'weekly', interval: 1, start_date: '2026-01-05' },
      3,
      new Date(2026, 0, 1),
    );
    expect(dates.map(localISO)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
    ]);
  });
});

describe('isOccurrence', () => {
  it('identifies a valid monthly occurrence', () => {
    expect(
      isOccurrence(
        { frequency: 'monthly', interval: 1, start_date: '2026-01-15' },
        new Date(2026, 2, 15),
      ),
    ).toBe(true);
  });
  it('returns false for off-cycle dates', () => {
    expect(
      isOccurrence(
        { frequency: 'monthly', interval: 1, start_date: '2026-01-15' },
        new Date(2026, 2, 16),
      ),
    ).toBe(false);
  });
});

describe('monthlyGoalTarget', () => {
  it('divides remaining by months left', () => {
    const target = monthlyGoalTarget(
      1_200_000,
      0,
      new Date(2026, 11, 1),
      new Date(2026, 5, 1),
    );
    // 6 months left → 200,000 per month
    expect(target).toBe(200_000);
  });

  it('returns target - current when date is past', () => {
    const target = monthlyGoalTarget(
      1_000,
      300,
      new Date(2026, 0, 1),
      new Date(2026, 5, 1),
    );
    expect(target).toBe(700);
  });

  it('returns null when no target date is provided', () => {
    expect(monthlyGoalTarget(100, 0, null)).toBeNull();
  });
});
