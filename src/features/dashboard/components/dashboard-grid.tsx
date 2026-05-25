import { useCallback, useEffect, useMemo, useState } from 'react';
// In react-grid-layout 2.x, `ResponsiveGridLayout` auto-measures its
// container width — the old WidthProvider HOC is gone. Types are from
// the 1.x line so we cast at the boundary.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - 2.x ESM named exports not in @types/react-grid-layout@1
import { ResponsiveGridLayout as RGLResponsive } from 'react-grid-layout';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { cn } from '@/lib/utils';
import { WIDGETS } from '../widgets/widget-registry';
import { loadLayout, saveLayout } from '../services/layout.service';
import type { WidgetContext, LayoutItem } from '../widgets/widget-types';

interface RGLLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}
type RGLLayouts = Record<string, RGLLayoutItem[]>;

interface RGLResponsiveProps {
  className?: string;
  layouts?: RGLLayouts;
  cols?: Record<string, number>;
  breakpoints?: Record<string, number>;
  rowHeight?: number;
  margin?: [number, number];
  isDraggable?: boolean;
  isResizable?: boolean;
  draggableHandle?: string;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  onLayoutChange?: (current: RGLLayoutItem[], all: RGLLayouts) => void;
  children?: React.ReactNode;
}

const ResponsiveGridLayout =
  RGLResponsive as unknown as React.ComponentType<RGLResponsiveProps>;

interface DashboardGridProps {
  ctx: Omit<WidgetContext, 'editing'>;
  editing: boolean;
  layout: LayoutItem[];
  onLayoutChange: (next: LayoutItem[]) => void;
  onRemoveItem: (instanceId: string) => void;
}

const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };

export function DashboardGrid({
  ctx,
  editing,
  layout,
  onLayoutChange,
  onRemoveItem,
}: DashboardGridProps) {
  // Strip layout items whose widgetId no longer exists (e.g. registry refactor).
  const visibleItems = useMemo(
    () => layout.filter((it) => Boolean(WIDGETS[it.widgetId])),
    [layout],
  );

  // Build the layouts map for ResponsiveGridLayout (we use the same layout
  // at every breakpoint; only the number of cols changes).
  const layouts: RGLLayouts = useMemo(() => {
    const lg: RGLLayoutItem[] = visibleItems.map((it) => {
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
      };
    });
    // For small breakpoints stack everything single-column. Width equals
    // the cols at that breakpoint so each item spans the full row.
    const buildStack = (cols: number): RGLLayoutItem[] =>
      visibleItems.map((it, i) => ({
        i: it.instanceId,
        x: 0,
        y: i * 2,
        w: cols,
        h: it.h,
      }));
    return {
      lg,
      md: lg,
      sm: lg,
      xs: buildStack(COLS.xs),
      xxs: buildStack(COLS.xxs),
    };
  }, [visibleItems]);

  const handleLayoutChange = useCallback(
    (_current: RGLLayoutItem[], all: RGLLayouts) => {
      // We only persist desktop layout. Mobile is auto-stacked.
      const lg = all.lg ?? all.md ?? all.sm ?? [];
      const next = visibleItems.map((it) => {
        const fresh = lg.find((l) => l.i === it.instanceId);
        if (!fresh) return it;
        return { ...it, x: fresh.x, y: fresh.y, w: fresh.w, h: fresh.h };
      });
      onLayoutChange(next);
    },
    [visibleItems, onLayoutChange],
  );

  return (
    <div className={cn(editing && 'editing-dashboard')}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        cols={COLS}
        breakpoints={BREAKPOINTS}
        rowHeight={56}
        margin={[12, 12]}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".widget-drag-handle"
        compactType="vertical"
        preventCollision={false}
        onLayoutChange={handleLayoutChange}
      >
        {visibleItems.map((it) => {
          const def = WIDGETS[it.widgetId]!;
          const Component = def.component;
          return (
            <div key={it.instanceId}>
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

/** Hook that loads + persists the layout for the current user/household. */
export function useDashboardLayout() {
  const userId = useAuthStore((s) => s.user?.id);
  const householdId = useHouseholdStore((s) => s.activeHousehold?.id);

  const [layout, setLayout] = useState<LayoutItem[]>([]);

  useEffect(() => {
    if (!userId || !householdId) return;
    setLayout(loadLayout(userId, householdId));
  }, [userId, householdId]);

  const update = useCallback(
    (next: LayoutItem[] | ((prev: LayoutItem[]) => LayoutItem[])) => {
      setLayout((prev) => {
        const value = typeof next === 'function' ? (next as (p: LayoutItem[]) => LayoutItem[])(prev) : next;
        if (userId && householdId) saveLayout(userId, householdId, value);
        return value;
      });
    },
    [userId, householdId],
  );

  return { layout, setLayout: update };
}
