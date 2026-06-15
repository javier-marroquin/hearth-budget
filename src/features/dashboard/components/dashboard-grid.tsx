import { useCallback, useEffect, useMemo, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout/legacy';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { loadLayout, saveLayout } from '../services/layout.service';
import { DEFAULT_LAYOUT } from '../widgets/widget-registry';
import { cn } from '@/lib/utils';
import { WIDGETS } from '../widgets/widget-registry';
import { reflowLayout, stackLayout } from '../lib/layout-utils';
import type { WidgetContext, LayoutItem } from '../widgets/widget-types';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  ctx: Omit<WidgetContext, 'editing'>;
  editing: boolean;
  layout: LayoutItem[];
  onLayoutChange: (next: LayoutItem[]) => void;
  onRemoveItem: (instanceId: string) => void;
}

const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };

function toRglItems(items: LayoutItem[], locked: boolean): Layout {
  return items.map((it) => {
    const def = WIDGETS[it.widgetId]!;
    return {
      i: it.instanceId,
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
      minW: def.minW,
      minH: def.minH,
      maxW: def.maxW,
      maxH: def.maxH,
      static: locked,
    };
  });
}

function fromRglItems(visibleItems: LayoutItem[], next: Layout): LayoutItem[] {
  return visibleItems.map((it) => {
    const fresh = next.find((l) => l.i === it.instanceId);
    if (!fresh) return it;
    return { ...it, x: fresh.x, y: fresh.y, w: fresh.w, h: fresh.h };
  });
}

export function DashboardGrid({
  ctx,
  editing,
  layout,
  onLayoutChange,
  onRemoveItem,
}: DashboardGridProps) {
  const visibleItems = useMemo(
    () => layout.filter((it) => Boolean(WIDGETS[it.widgetId])),
    [layout],
  );

  const locked = !editing;

  /** Live lg layout — avoids snap-back when parent re-renders mid-drag. */
  const [lgLayout, setLgLayout] = useState<Layout>(() =>
    toRglItems(visibleItems, locked),
  );

  useEffect(() => {
    setLgLayout(toRglItems(visibleItems, locked));
  }, [visibleItems, locked]);

  const layouts: ResponsiveLayouts = useMemo(() => {
    const lg = lgLayout;
    const md = lgLayout;
    const sm = toRglItems(reflowLayout(visibleItems, COLS.sm), locked);
    const xs = toRglItems(stackLayout(visibleItems, COLS.xs), locked);
    const xxs = toRglItems(stackLayout(visibleItems, COLS.xxs), locked);
    return { lg, md, sm, xs, xxs };
  }, [lgLayout, visibleItems, locked]);

  const persistLayout = useCallback(
    (next: Layout) => {
      setLgLayout(next);
      const updated = fromRglItems(visibleItems, next);
      const changed = updated.some((u, i) => {
        const prev = visibleItems[i]!;
        return (
          prev.x !== u.x ||
          prev.y !== u.y ||
          prev.w !== u.w ||
          prev.h !== u.h
        );
      });
      if (changed) onLayoutChange(updated);
    },
    [visibleItems, onLayoutChange],
  );

  /** Keep grid positions in sync while dragging (before parent state updates). */
  const handleLayoutChange = useCallback(
    (_current: Layout, allLayouts: ResponsiveLayouts) => {
      if (!editing) return;
      const next = allLayouts.lg ?? _current;
      setLgLayout(next);
    },
    [editing],
  );

  return (
    <div className={cn('dashboard-grid', editing && 'editing-dashboard')}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        cols={COLS}
        breakpoints={BREAKPOINTS}
        rowHeight={48}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".widget-drag-handle"
        compactType={editing ? 'vertical' : null}
        preventCollision={false}
        onLayoutChange={handleLayoutChange}
        onDragStop={persistLayout}
        onResizeStop={persistLayout}
      >
        {visibleItems.map((it) => {
          const def = WIDGETS[it.widgetId]!;
          const Component = def.component;
          return (
            <div key={it.instanceId} className="h-full min-h-0">
              <Component
                ctx={{ ...ctx, editing }}
                config={it.config}
                onRemove={() => onRemoveItem(it.instanceId)}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}

export function useDashboardLayout() {
  const userId = useAuthStore((s) => s.user?.id);
  const householdId = useHouseholdStore((s) => s.activeHousehold?.id);

  const [layout, setLayoutState] = useState<LayoutItem[]>(DEFAULT_LAYOUT);

  useEffect(() => {
    if (!userId || !householdId) return;
    setLayoutState(loadLayout(userId, householdId));
  }, [userId, householdId]);

  const setLayout = useCallback(
    (next: LayoutItem[] | ((prev: LayoutItem[]) => LayoutItem[])) => {
      setLayoutState((prev) => {
        const value =
          typeof next === 'function'
            ? (next as (p: LayoutItem[]) => LayoutItem[])(prev)
            : next;
        if (userId && householdId) saveLayout(userId, householdId, value);
        return value;
      });
    },
    [userId, householdId],
  );

  return { layout, setLayout };
}
