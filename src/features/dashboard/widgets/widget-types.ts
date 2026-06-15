/**
 * Widget system: a widget is anything that can live in the dashboard grid.
 *
 * Each widget definition declares:
 *   - id (stable identifier in the registry)
 *   - default size (in 12-col grid units + rows)
 *   - min size
 *   - whether it can be added more than once
 *   - the React component that renders it
 *
 * A *layout item* is one instance placed in the user's grid.
 */

import type { ComponentType } from 'react';
import type { HouseholdKpis } from '../services/kpis.service';

export type WidgetCategory = 'kpi' | 'chart' | 'list' | 'envelope' | 'projection';

export interface WidgetContext {
  householdId: string;
  currency: string;
  envelopeMode: boolean;
  /** All KPIs of the active household (lazy: may still be loading when first rendered). */
  kpis: HouseholdKpis | undefined;
  /** Lookup `userId → display name` for the active household. */
  memberLookup: Map<string, string>;
  /** Are we in edit mode? Widgets may render differently when true. */
  editing: boolean;
}

export interface WidgetProps {
  ctx: WidgetContext;
  /** Optional per-instance config (e.g. window=14 for upcoming). */
  config?: Record<string, unknown>;
  /** Called when the user clicks the X to remove this instance. */
  onRemove?: () => void;
}

export interface WidgetDef {
  id: string;
  category: WidgetCategory;
  labelKey: string;
  descriptionKey: string;
  /** Default cell size in the 12-col grid. */
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
  /** Component to render. */
  component: ComponentType<WidgetProps>;
  /** Allow more than one instance in the grid. */
  multiple?: boolean;
}

/**
 * One placed widget in the user's dashboard. The `widgetId` references a
 * WidgetDef from the registry; `instanceId` uniquely identifies this
 * placement (so the same widget can appear twice if allowed).
 */
export interface LayoutItem {
  instanceId: string;
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}
