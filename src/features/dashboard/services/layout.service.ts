/**
 * Per-user-per-household dashboard layout persistence.
 *
 * We use `localStorage` keyed by `userId:householdId` for now. Future:
 * sync to a `dashboard_layouts` table on the server so the layout follows
 * the user across devices.
 */

import { DEFAULT_LAYOUT } from '../widgets/widget-registry';
import type { LayoutItem } from '../widgets/widget-types';

const STORAGE_KEY = 'household-budget:dashboard-layout';

function key(userId: string, householdId: string): string {
  return `${STORAGE_KEY}:${userId}:${householdId}`;
}

export function loadLayout(userId: string, householdId: string): LayoutItem[] {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(key(userId, householdId));
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT;
    // Lightweight validation: every entry must have instanceId + widgetId.
    const valid = parsed.every(
      (it) =>
        it &&
        typeof (it as LayoutItem).instanceId === 'string' &&
        typeof (it as LayoutItem).widgetId === 'string' &&
        typeof (it as LayoutItem).x === 'number' &&
        typeof (it as LayoutItem).y === 'number' &&
        typeof (it as LayoutItem).w === 'number' &&
        typeof (it as LayoutItem).h === 'number',
    );
    if (!valid) return DEFAULT_LAYOUT;
    return parsed as LayoutItem[];
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(
  userId: string,
  householdId: string,
  layout: LayoutItem[],
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(userId, householdId), JSON.stringify(layout));
  } catch {
    // ignore quota errors
  }
}

export function resetLayout(userId: string, householdId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key(userId, householdId));
  } catch {
    // ignore
  }
}
