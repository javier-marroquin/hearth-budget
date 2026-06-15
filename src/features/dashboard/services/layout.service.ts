/**
 * Per-user-per-household dashboard layout persistence.
 *
 * Uses `localStorage` keyed by `userId:householdId`. The stored payload
 * carries a `version` so that when we ship a new DEFAULT_LAYOUT we can
 * invalidate older layouts (users get the polished default instead of
 * being stuck with a stale arrangement).
 */

import { DEFAULT_LAYOUT } from '../widgets/widget-registry';
import type { LayoutItem } from '../widgets/widget-types';

const STORAGE_KEY = 'household-budget:dashboard-layout';

/**
 * Bump this when DEFAULT_LAYOUT changes so existing users pick it up.
 * - v1: initial dense layout (all 14 widgets)
 * - v2: curated layout (May 2026) with cleaner ordering
 * - v3: 5 KPIs in one row, sidebar upcoming, no auto-compact when viewing
 * - v4: fix react-grid-layout v2 (WidthProvider) + layout sin solapamientos
 */
const LAYOUT_VERSION = 4;

interface StoredPayload {
  version: number;
  items: LayoutItem[];
}

function key(userId: string, householdId: string): string {
  return `${STORAGE_KEY}:${userId}:${householdId}`;
}

function isValidItem(it: unknown): it is LayoutItem {
  return (
    typeof it === 'object' &&
    it !== null &&
    typeof (it as LayoutItem).instanceId === 'string' &&
    typeof (it as LayoutItem).widgetId === 'string' &&
    typeof (it as LayoutItem).x === 'number' &&
    typeof (it as LayoutItem).y === 'number' &&
    typeof (it as LayoutItem).w === 'number' &&
    typeof (it as LayoutItem).h === 'number'
  );
}

export function loadLayout(userId: string, householdId: string): LayoutItem[] {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(key(userId, householdId));
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as unknown;

    // Backward-compat: legacy entries were a bare array. Treat them as
    // version 1 → auto-upgrade to the new default.
    if (Array.isArray(parsed)) return DEFAULT_LAYOUT;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as StoredPayload).version !== 'number'
    ) {
      return DEFAULT_LAYOUT;
    }

    const payload = parsed as StoredPayload;
    if (payload.version !== LAYOUT_VERSION) return DEFAULT_LAYOUT;
    if (!Array.isArray(payload.items)) return DEFAULT_LAYOUT;
    if (!payload.items.every(isValidItem)) return DEFAULT_LAYOUT;

    return payload.items;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(
  userId: string,
  householdId: string,
  items: LayoutItem[],
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredPayload = { version: LAYOUT_VERSION, items };
    window.localStorage.setItem(key(userId, householdId), JSON.stringify(payload));
  } catch {
    // ignore quota / private mode errors
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
