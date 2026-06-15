/**
 * Unified "what's coming next" feed for the dashboard.
 */

import { apiFetch } from '@/lib/api/client';

export type UpcomingKind =
  | 'income'
  | 'expense'
  | 'contribution'
  | 'event'
  | 'goal';

export interface UpcomingItem {
  id: string;
  kind: UpcomingKind;
  sourceId: string;
  title: string;
  subtitle?: string | null;
  date: string;
  amount?: number | null;
  currency?: string | null;
  daysUntil: number;
  tone: 'income' | 'expense' | 'contribution' | 'event' | 'goal';
  categoryColor?: string | null;
  categoryId?: string | null;
  userId?: string | null;
  status?: string | null;
}

export interface UpcomingResult {
  items: UpcomingItem[];
  totalIncome: number;
  totalExpense: number;
  totalContribution: number;
  overdueCount: number;
}

interface FetchInput {
  householdId: string;
  windowDays?: number;
  includeOverdue?: boolean;
}

export async function fetchUpcoming(input: FetchInput): Promise<UpcomingResult> {
  const qs = new URLSearchParams();
  if (input.windowDays !== undefined) qs.set('windowDays', String(input.windowDays));
  if (input.includeOverdue !== undefined) {
    qs.set('includeOverdue', String(input.includeOverdue));
  }
  const query = qs.toString();
  return apiFetch(
    `/api/households/${input.householdId}/upcoming${query ? `?${query}` : ''}`,
  );
}
