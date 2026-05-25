/**
 * Pure recurrence engine.
 *
 * Given a recurring_rule it can:
 *   - compute the next N occurrence dates from a reference
 *   - check whether a date falls on the recurrence
 *
 * No DB calls, no React.
 */

import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  setDate,
  setDay,
  startOfDay,
} from 'date-fns';

// Defined here locally (NOT imported from @/lib/supabase/database.types) so
// this module can be imported from Netlify Functions, which use a different
// tsconfig without the `@/` alias.
export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // every N units
  start_date: string; // ISO date
  end_date?: string | null;
  day_of_month?: number | null;
  day_of_week?: number | null; // 0=Sun..6=Sat
  occurrences?: number | null;
}

/**
 * Returns the next `count` occurrences strictly on or after `from`.
 */
export function nextOccurrences(
  rule: RecurrenceRule,
  count: number,
  from: Date = new Date(),
): Date[] {
  const start = startOfDay(new Date(rule.start_date));
  const end = rule.end_date ? startOfDay(new Date(rule.end_date)) : null;
  const fromDay = startOfDay(from);
  const out: Date[] = [];
  let cursor = start;
  let iterations = 0;
  const maxOccurrences = rule.occurrences ?? Number.MAX_SAFE_INTEGER;
  const HARD_LIMIT = 1000; // safety

  while (out.length < count && iterations < HARD_LIMIT) {
    if (end && isAfter(cursor, end)) break;
    if (iterations >= maxOccurrences) break;
    if (!isBefore(cursor, fromDay)) {
      out.push(cursor);
    }
    cursor = advance(cursor, rule);
    iterations++;
  }
  return out;
}

/**
 * Returns true if `date` is a valid occurrence of `rule`.
 */
export function isOccurrence(rule: RecurrenceRule, date: Date): boolean {
  const start = startOfDay(new Date(rule.start_date));
  const end = rule.end_date ? startOfDay(new Date(rule.end_date)) : null;
  const target = startOfDay(date);
  if (isBefore(target, start)) return false;
  if (end && isAfter(target, end)) return false;

  let cursor = start;
  const maxOccurrences = rule.occurrences ?? Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < maxOccurrences && i < 5000; i++) {
    if (isEqual(cursor, target) || isSameDay(cursor, target)) return true;
    if (isAfter(cursor, target)) return false;
    cursor = advance(cursor, rule);
  }
  return false;
}

function advance(d: Date, rule: RecurrenceRule): Date {
  const i = Math.max(1, rule.interval);
  switch (rule.frequency) {
    case 'daily':
      return addDays(d, i);
    case 'weekly': {
      const next = addWeeks(d, i);
      if (rule.day_of_week !== null && rule.day_of_week !== undefined) {
        return setDay(next, rule.day_of_week, { weekStartsOn: 0 });
      }
      return next;
    }
    case 'biweekly':
      return addWeeks(d, 2 * i);
    case 'monthly': {
      const next = addMonths(d, i);
      if (rule.day_of_month !== null && rule.day_of_month !== undefined) {
        return setDate(next, rule.day_of_month);
      }
      return next;
    }
    case 'quarterly':
      return addMonths(d, 3 * i);
    case 'yearly':
      return addYears(d, i);
    default:
      return addDays(d, i);
  }
}

/**
 * Calculate the suggested monthly target for a goal: how much do we need to
 * save each month to reach `target_amount` by `target_date`.
 */
export function monthlyGoalTarget(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date | string | null | undefined,
  from: Date = new Date(),
): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const monthsRemaining =
    (target.getFullYear() - from.getFullYear()) * 12 +
    (target.getMonth() - from.getMonth());
  if (monthsRemaining <= 0) return Math.max(targetAmount - currentAmount, 0);
  return Math.max((targetAmount - currentAmount) / monthsRemaining, 0);
}
