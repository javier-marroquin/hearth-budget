import {
  KpiActualSavingsWidget,
  KpiBalanceWidget,
  KpiComplianceWidget,
  KpiContributionsPendingWidget,
  KpiContributionsReceivedWidget,
  KpiHeroWidget,
  KpiMinSavingsWidget,
  KpiOverdueWidget,
  KpiProjectionWidget,
  KpiSavingsRateWidget,
  KpiTotalExpenseWidget,
  KpiTotalIncomeWidget,
  KpiUnallocatedWidget,
} from './kpi-widgets';
import {
  ChartCategoryDoughnutWidget,
  ChartContributionsByMemberWidget,
  ChartFixedVsVariableWidget,
  ChartIncomeVsExpenseWidget,
} from './chart-widgets';
import { UpcomingWidget } from './upcoming-widget';
import type { LayoutItem, WidgetDef } from './widget-types';

/**
 * Master catalogue of widgets available in the dashboard.
 * Keys are stable: do NOT rename or you'll break stored layouts.
 */
export const WIDGETS: Record<string, WidgetDef> = {
  // ---- KPI cards (default 3 wide × 2 tall) -------------------------------
  'kpi-hero': {
    id: 'kpi-hero',
    category: 'kpi',
    label: 'KPI Hero — Ingreso mínimo',
    description: 'Tarjeta destacada que responde la pregunta principal del hogar.',
    defaultW: 12,
    defaultH: 3,
    minW: 6,
    minH: 3,
    component: KpiHeroWidget,
  },
  'kpi-total-income': {
    id: 'kpi-total-income',
    category: 'kpi',
    label: 'Ingreso total',
    description: 'Suma de ingresos del mes. Click → ver ingresos.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiTotalIncomeWidget,
  },
  'kpi-total-expense': {
    id: 'kpi-total-expense',
    category: 'kpi',
    label: 'Gasto total',
    description: 'Suma de gastos del mes. Click → ver gastos.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiTotalExpenseWidget,
  },
  'kpi-balance': {
    id: 'kpi-balance',
    category: 'kpi',
    label: 'Balance disponible',
    description: 'Ingreso − Gasto.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiBalanceWidget,
  },
  'kpi-savings-rate': {
    id: 'kpi-savings-rate',
    category: 'kpi',
    label: '% de ahorro',
    description: 'Porcentaje del ingreso que se está ahorrando.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiSavingsRateWidget,
  },
  'kpi-overdue': {
    id: 'kpi-overdue',
    category: 'kpi',
    label: 'Pagos vencidos',
    description: 'Cantidad de gastos vencidos. Click → filtro overdue.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiOverdueWidget,
  },
  'kpi-min-savings': {
    id: 'kpi-min-savings',
    category: 'kpi',
    label: 'Ahorro mínimo (10%)',
    description: 'Monto mínimo recomendado a ahorrar.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiMinSavingsWidget,
  },
  'kpi-actual-savings': {
    id: 'kpi-actual-savings',
    category: 'kpi',
    label: 'Ahorro real',
    description: 'Lo que realmente se está ahorrando.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiActualSavingsWidget,
  },
  'kpi-contributions-received': {
    id: 'kpi-contributions-received',
    category: 'kpi',
    label: 'Aportes recibidos',
    description: 'Total de aportes ya recibidos este mes.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiContributionsReceivedWidget,
  },
  'kpi-contributions-pending': {
    id: 'kpi-contributions-pending',
    category: 'kpi',
    label: 'Aportes pendientes',
    description: 'Total de aportes esperados pero no recibidos.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiContributionsPendingWidget,
  },
  'kpi-compliance': {
    id: 'kpi-compliance',
    category: 'kpi',
    label: 'Cumplimiento presupuesto',
    description: '% gastado vs presupuestado (modo Envelope).',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiComplianceWidget,
  },
  'kpi-unallocated': {
    id: 'kpi-unallocated',
    category: 'envelope',
    label: 'Sin asignar (envelope)',
    description: 'Ingreso − presupuestos asignados.',
    defaultW: 3,
    defaultH: 2,
    minW: 2,
    minH: 2,
    component: KpiUnallocatedWidget,
  },
  'kpi-projection': {
    id: 'kpi-projection',
    category: 'projection',
    label: 'Proyección cierre mensual',
    description: 'Ingreso/gasto/balance proyectados.',
    defaultW: 6,
    defaultH: 2,
    minW: 4,
    minH: 2,
    component: KpiProjectionWidget,
  },

  // ---- Charts (default 6 wide × 4 tall) ---------------------------------
  'chart-income-vs-expense': {
    id: 'chart-income-vs-expense',
    category: 'chart',
    label: 'Ingresos vs Gastos (12 meses)',
    description: 'Gráfico lineal con tendencia mensual.',
    defaultW: 8,
    defaultH: 4,
    minW: 4,
    minH: 3,
    component: ChartIncomeVsExpenseWidget,
  },
  'chart-category-doughnut': {
    id: 'chart-category-doughnut',
    category: 'chart',
    label: 'Gastos por categoría',
    description: 'Distribución doughnut. Click → ver gastos.',
    defaultW: 4,
    defaultH: 4,
    minW: 3,
    minH: 3,
    component: ChartCategoryDoughnutWidget,
  },
  'chart-contributions-by-member': {
    id: 'chart-contributions-by-member',
    category: 'chart',
    label: 'Aportes por miembro',
    description: 'Barras horizontales recibido/pendiente.',
    defaultW: 6,
    defaultH: 4,
    minW: 4,
    minH: 3,
    component: ChartContributionsByMemberWidget,
  },
  'chart-fixed-vs-variable': {
    id: 'chart-fixed-vs-variable',
    category: 'chart',
    label: 'Fijos vs Variables',
    description: 'Stacked bar del mes.',
    defaultW: 6,
    defaultH: 4,
    minW: 3,
    minH: 3,
    component: ChartFixedVsVariableWidget,
  },

  // ---- Lists ------------------------------------------------------------
  'upcoming-timeline': {
    id: 'upcoming-timeline',
    category: 'list',
    label: 'Próximos eventos',
    description: 'Timeline de pagos, ingresos y eventos próximos.',
    defaultW: 12,
    defaultH: 6,
    minW: 4,
    minH: 4,
    component: UpcomingWidget,
    multiple: true,
  },
};

/**
 * Default dashboard layout. Curated for visual hierarchy:
 *   1. HERO across the top (the main question)
 *   2. 4 primary KPIs in one row
 *   3. Upcoming events timeline (medium height)
 *   4. Main trend chart + category breakdown side-by-side
 *   5. Secondary KPIs (overdue + contributions)
 *   6. Two analytical charts side-by-side
 *   7. Month-end projection footer
 *
 * Other widgets (actual savings, compliance, unallocated, etc.) are
 * available through the widget palette but kept OUT of the default so
 * users see a tidy dashboard on first load.
 */
export const DEFAULT_LAYOUT: LayoutItem[] = [
  // ── ROW 1 — HERO ────────────────────────────────────────── (12 × 3)
  { instanceId: 'hero', widgetId: 'kpi-hero', x: 0, y: 0, w: 12, h: 3 },

  // ── ROW 2 — Primary KPIs ────────────────────────────────── (3 × 2 each)
  { instanceId: 'inc', widgetId: 'kpi-total-income', x: 0, y: 3, w: 3, h: 2 },
  { instanceId: 'exp', widgetId: 'kpi-total-expense', x: 3, y: 3, w: 3, h: 2 },
  { instanceId: 'bal', widgetId: 'kpi-balance', x: 6, y: 3, w: 3, h: 2 },
  { instanceId: 'savings', widgetId: 'kpi-savings-rate', x: 9, y: 3, w: 3, h: 2 },

  // ── ROW 3 — Upcoming timeline ───────────────────────────── (12 × 5)
  { instanceId: 'upcoming', widgetId: 'upcoming-timeline', x: 0, y: 5, w: 12, h: 5 },

  // ── ROW 4 — Main trend + category breakdown ─────────────── (8+4 × 4)
  {
    instanceId: 'ive',
    widgetId: 'chart-income-vs-expense',
    x: 0,
    y: 10,
    w: 8,
    h: 4,
  },
  {
    instanceId: 'cdoh',
    widgetId: 'chart-category-doughnut',
    x: 8,
    y: 10,
    w: 4,
    h: 4,
  },

  // ── ROW 5 — Secondary KPIs ──────────────────────────────── (3 × 2 each)
  { instanceId: 'ovd', widgetId: 'kpi-overdue', x: 0, y: 14, w: 3, h: 2 },
  {
    instanceId: 'cr',
    widgetId: 'kpi-contributions-received',
    x: 3,
    y: 14,
    w: 3,
    h: 2,
  },
  {
    instanceId: 'cp',
    widgetId: 'kpi-contributions-pending',
    x: 6,
    y: 14,
    w: 3,
    h: 2,
  },
  { instanceId: 'minsav', widgetId: 'kpi-min-savings', x: 9, y: 14, w: 3, h: 2 },

  // ── ROW 6 — Analytical charts ───────────────────────────── (6 × 4 each)
  {
    instanceId: 'fvv',
    widgetId: 'chart-fixed-vs-variable',
    x: 0,
    y: 16,
    w: 6,
    h: 4,
  },
  {
    instanceId: 'cbym',
    widgetId: 'chart-contributions-by-member',
    x: 6,
    y: 16,
    w: 6,
    h: 4,
  },

  // ── ROW 7 — Projection footer ───────────────────────────── (12 × 2)
  { instanceId: 'proj', widgetId: 'kpi-projection', x: 0, y: 20, w: 12, h: 2 },
];
