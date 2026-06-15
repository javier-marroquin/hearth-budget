import { useCallback, useEffect, useState } from 'react';
import type { UpcomingItem } from '../services/upcoming.service';

function storageKey(householdId: string) {
  return `hearth-budget:upcoming-order:${householdId}`;
}

function loadOrder(householdId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(householdId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveOrder(householdId: string, ids: string[]) {
  localStorage.setItem(storageKey(householdId), JSON.stringify(ids));
}

/** Sort items: custom order first, then chronological for new items. */
export function sortUpcomingItems(items: UpcomingItem[], order: string[]): UpcomingItem[] {
  const indexOf = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  return [...items].sort((a, b) => {
    const oa = indexOf(a.id);
    const ob = indexOf(b.id);
    if (oa !== ob) return oa - ob;
    const dc = a.date.localeCompare(b.date);
    if (dc !== 0) return dc;
    return a.title.localeCompare(b.title);
  });
}

export function useUpcomingOrder(householdId: string) {
  const [order, setOrder] = useState<string[]>(() => loadOrder(householdId));

  useEffect(() => {
    setOrder(loadOrder(householdId));
  }, [householdId]);

  const applyOrder = useCallback(
    (items: UpcomingItem[]) => sortUpcomingItems(items, order),
    [order],
  );

  const setOrderedIds = useCallback(
    (ids: string[]) => {
      setOrder(ids);
      saveOrder(householdId, ids);
    },
    [householdId],
  );

  const moveItem = useCallback(
    (dragId: string, targetId: string, allIds?: string[]) => {
      if (dragId === targetId) return;
      const base =
        order.length > 0
          ? order.filter((id) => !allIds || allIds.includes(id))
          : (allIds ?? []);
      const missing = (allIds ?? []).filter((id) => !base.includes(id));
      const next = [...base, ...missing];
      const from = next.indexOf(dragId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return;
      const reordered = [...next];
      reordered.splice(from, 1);
      reordered.splice(to, 0, dragId);
      setOrderedIds(reordered);
    },
    [order, setOrderedIds],
  );

  const syncWithItems = useCallback(
    (items: UpcomingItem[]) => {
      const ids = items.map((i) => i.id);
      const kept = order.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      if (added.length > 0 || kept.length !== order.length) {
        setOrderedIds([...kept, ...added]);
      }
    },
    [order, setOrderedIds],
  );

  return { applyOrder, moveItem, setOrderedIds, syncWithItems };
}
