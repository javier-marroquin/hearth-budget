/**
 * Date helpers tailored for household-budget calculations.
 * All dates are handled in the household's timezone via date-fns-tz.
 */

import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from 'date-fns';

/** Returns the [start, end] of the given month (or current month). */
export function getMonthBounds(date: Date = new Date()): { start: Date; end: Date } {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

/** ISO yyyy-MM-dd. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse "yyyy-MM-dd" or full ISO to Date. */
export function fromISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when the date is overdue (past today's start of day). */
export function isOverdue(due: Date | string, today: Date = new Date()): boolean {
  const d = typeof due === 'string' ? parseISO(due) : due;
  return isBefore(d, startOfDay(today));
}

/** True when due date is in the next N days. */
export function isUpcoming(
  due: Date | string,
  days = 7,
  today: Date = new Date(),
): boolean {
  const d = typeof due === 'string' ? parseISO(due) : due;
  return isWithinInterval(d, { start: today, end: addDays(today, days) });
}

/** Difference in days (negative = overdue). */
export function daysUntil(due: Date | string, today: Date = new Date()): number {
  const d = typeof due === 'string' ? parseISO(due) : due;
  return differenceInDays(d, today);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Returns a range of N months back/forward including the current. */
export function getMonthRange(
  monthsBack: number,
  monthsForward = 0,
  reference = new Date(),
): Date[] {
  const months: Date[] = [];
  for (let i = -monthsBack; i <= monthsForward; i++) {
    months.push(startOfMonth(addMonths(reference, i)));
  }
  return months;
}

export { addDays, addMonths, isAfter, isBefore, startOfMonth, endOfMonth, parseISO };
