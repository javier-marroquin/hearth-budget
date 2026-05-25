/**
 * Expense splitting algorithms.
 *
 * Given a total expense and a list of participants, distribute the amount
 * across them according to a method.
 */

import type { SplitMethod } from '@/lib/supabase/database.types';

export interface SplitParticipant {
  userId: string;
  /** Used for `percentage` method (0..100). */
  percentage?: number;
  /** Used for `income_based` method. */
  income?: number;
  /** Used for `custom` method. */
  amount?: number;
}

export interface SplitResult {
  userId: string;
  amount: number;
  percentage: number;
}

/**
 * Split `total` among `participants` using the chosen method.
 *
 * Always returns an exact total: rounding remainders are pushed to the last
 * participant so the sum equals `total` to the cent.
 */
export function splitExpense(
  total: number,
  participants: SplitParticipant[],
  method: SplitMethod,
): SplitResult[] {
  if (participants.length === 0) return [];
  if (total <= 0) {
    return participants.map((p) => ({ userId: p.userId, amount: 0, percentage: 0 }));
  }

  switch (method) {
    case 'equal':
      return splitEqual(total, participants);
    case 'percentage':
      return splitByPercentage(total, participants);
    case 'income_based':
      return splitByIncome(total, participants);
    case 'custom':
      return splitCustom(total, participants);
    default:
      return splitEqual(total, participants);
  }
}

function splitEqual(total: number, participants: SplitParticipant[]): SplitResult[] {
  const n = participants.length;
  const each = roundCents(total / n);
  return assignWithRemainder(total, participants, () => each);
}

function splitByPercentage(
  total: number,
  participants: SplitParticipant[],
): SplitResult[] {
  const sumPct = participants.reduce((acc, p) => acc + (p.percentage ?? 0), 0);
  if (sumPct <= 0) return splitEqual(total, participants);
  return assignWithRemainder(total, participants, (p) =>
    roundCents((total * (p.percentage ?? 0)) / sumPct),
  );
}

function splitByIncome(
  total: number,
  participants: SplitParticipant[],
): SplitResult[] {
  const sumIncome = participants.reduce((acc, p) => acc + (p.income ?? 0), 0);
  if (sumIncome <= 0) return splitEqual(total, participants);
  return assignWithRemainder(total, participants, (p) =>
    roundCents((total * (p.income ?? 0)) / sumIncome),
  );
}

function splitCustom(total: number, participants: SplitParticipant[]): SplitResult[] {
  const allDefined = participants.every((p) => typeof p.amount === 'number');
  if (!allDefined) return splitEqual(total, participants);
  const sumAmount = participants.reduce((acc, p) => acc + (p.amount ?? 0), 0);
  // Scale custom amounts so they exactly equal `total`.
  if (sumAmount <= 0) return splitEqual(total, participants);
  const factor = total / sumAmount;
  return assignWithRemainder(total, participants, (p) =>
    roundCents((p.amount ?? 0) * factor),
  );
}

/**
 * Apply `compute` to each participant, then adjust the last allocation so the
 * sum exactly equals `total` (compensates floating-point rounding).
 */
function assignWithRemainder(
  total: number,
  participants: SplitParticipant[],
  compute: (p: SplitParticipant) => number,
): SplitResult[] {
  const amounts = participants.map(compute);
  const sum = amounts.reduce((acc, n) => acc + n, 0);
  const delta = roundCents(total - sum);
  if (delta !== 0 && amounts.length > 0) {
    amounts[amounts.length - 1] = roundCents((amounts[amounts.length - 1] ?? 0) + delta);
  }
  return participants.map((p, i) => ({
    userId: p.userId,
    amount: amounts[i] ?? 0,
    percentage: total > 0 ? ((amounts[i] ?? 0) / total) * 100 : 0,
  }));
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}
