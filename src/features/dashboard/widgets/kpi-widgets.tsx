import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  type LucideIcon,
  AlertTriangle,
  CalendarClock,
  DollarSign,
  HandCoins,
  PiggyBank,
  Receipt,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { WidgetShell } from './widget-shell';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getMonthBounds, toISODate } from '@/lib/date';
import type { WidgetProps } from './widget-types';

type Tone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const TONE_BG: Record<Tone, string> = {
  default: 'bg-muted/40 text-foreground',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  destructive: 'bg-red-500/15 text-red-600 dark:text-red-400',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
};

interface InnerProps {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  navigateTo?: string;
  editing: boolean;
  onRemove?: () => void;
}

function KpiInner({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  navigateTo,
  editing,
  onRemove,
}: InnerProps) {
  const navigate = useNavigate();
  return (
    <WidgetShell
      title={title}
      editing={editing}
      onRemove={onRemove}
      onActivate={navigateTo ? () => navigate(navigateTo) : undefined}
      contentClassName="flex flex-col justify-between"
    >
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-full flex-col justify-between gap-2"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="break-words text-2xl font-bold leading-tight tracking-tight">
            {value}
          </p>
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              TONE_BG[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </motion.div>
    </WidgetShell>
  );
}

function LoadingShell({
  title,
  editing,
  onRemove,
}: {
  title: string;
  editing: boolean;
  onRemove?: () => void;
}) {
  return (
    <WidgetShell title={title} editing={editing} onRemove={onRemove}>
      <Skeleton className="h-8 w-3/4" />
    </WidgetShell>
  );
}

function monthRangeQuery(): string {
  const { start, end } = getMonthBounds(new Date());
  return `from=${toISODate(start)}&to=${toISODate(end)}`;
}

// =============================================================================
// 1. Total income
// =============================================================================
export function KpiTotalIncomeWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return (
      <LoadingShell title={t('dashboard.total_income')} editing={ctx.editing} />
    );
  return (
    <KpiInner
      title={t('dashboard.total_income')}
      value={formatCurrency(ctx.kpis.totalIncome, {
        currency: ctx.currency,
        compact: true,
      })}
      icon={Wallet}
      tone="success"
      navigateTo={`/incomes?${monthRangeQuery()}`}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 2. Total expense
// =============================================================================
export function KpiTotalExpenseWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return (
      <LoadingShell title={t('dashboard.total_expense')} editing={ctx.editing} />
    );
  const over = ctx.kpis.totalExpense > ctx.kpis.totalIncome;
  return (
    <KpiInner
      title={t('dashboard.total_expense')}
      value={formatCurrency(ctx.kpis.totalExpense, {
        currency: ctx.currency,
        compact: true,
      })}
      icon={Receipt}
      tone={over ? 'destructive' : 'default'}
      navigateTo={`/expenses?${monthRangeQuery()}`}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 3. Balance
// =============================================================================
export function KpiBalanceWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis) return <LoadingShell title={t('dashboard.balance')} editing={ctx.editing} />;
  return (
    <KpiInner
      title={t('dashboard.balance')}
      value={formatCurrency(ctx.kpis.balance, {
        currency: ctx.currency,
        compact: true,
      })}
      icon={DollarSign}
      tone={ctx.kpis.balance >= 0 ? 'success' : 'destructive'}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 4. Savings rate
// =============================================================================
export function KpiSavingsRateWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return <LoadingShell title={t('dashboard.savings_pct')} editing={ctx.editing} />;
  return (
    <KpiInner
      title={t('dashboard.savings_pct')}
      value={formatPercent(ctx.kpis.savingsRate)}
      hint={`${t('dashboard.min_savings')}: 10%`}
      icon={PiggyBank}
      tone={ctx.kpis.belowSavingsTarget ? 'warning' : 'success'}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 5. Overdue payments
// =============================================================================
export function KpiOverdueWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return (
      <LoadingShell title={t('dashboard.overdue_payments')} editing={ctx.editing} />
    );
  return (
    <KpiInner
      title={t('dashboard.overdue_payments')}
      value={String(ctx.kpis.overduePaymentsCount)}
      hint={`${ctx.kpis.upcomingPaymentsCount} próximos`}
      icon={AlertTriangle}
      tone={ctx.kpis.overduePaymentsCount > 0 ? 'destructive' : 'default'}
      navigateTo={`/expenses?status=overdue`}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 6. Min savings (10%)
// =============================================================================
export function KpiMinSavingsWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return <LoadingShell title={t('dashboard.min_savings')} editing={ctx.editing} />;
  return (
    <KpiInner
      title={t('dashboard.min_savings')}
      value={formatCurrency(ctx.kpis.minSavings, {
        currency: ctx.currency,
        compact: true,
      })}
      icon={Target}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 7. Actual savings
// =============================================================================
export function KpiActualSavingsWidget({ ctx, onRemove }: WidgetProps) {
  const { t: _t } = useTranslation();
  if (!ctx.kpis) return <LoadingShell title="Ahorro real" editing={ctx.editing} />;
  return (
    <KpiInner
      title="Ahorro real"
      value={formatCurrency(ctx.kpis.actualSavings, {
        currency: ctx.currency,
        compact: true,
      })}
      icon={PiggyBank}
      tone={ctx.kpis.actualSavings >= ctx.kpis.minSavings ? 'success' : 'warning'}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 8. Contributions received
// =============================================================================
export function KpiContributionsReceivedWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return (
      <LoadingShell
        title={t('dashboard.contributions_received')}
        editing={ctx.editing}
      onRemove={onRemove}
      />
    );
  return (
    <KpiInner
      title={t('dashboard.contributions_received')}
      value={formatCurrency(ctx.kpis.contributionsReceived, {
        currency: ctx.currency,
        compact: true,
      })}
      icon={HandCoins}
      tone="success"
      navigateTo={`/contributions?status=received`}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 9. Contributions pending
// =============================================================================
export function KpiContributionsPendingWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return (
      <LoadingShell
        title={t('dashboard.contributions_pending')}
        editing={ctx.editing}
      onRemove={onRemove}
      />
    );
  return (
    <KpiInner
      title={t('dashboard.contributions_pending')}
      value={formatCurrency(ctx.kpis.contributionsPending, {
        currency: ctx.currency,
        compact: true,
      })}
      icon={CalendarClock}
      tone={ctx.kpis.contributionsPending > 0 ? 'warning' : 'default'}
      navigateTo={`/contributions?status=pending`}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 10. Compliance %
// =============================================================================
export function KpiComplianceWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return <LoadingShell title={t('dashboard.compliance')} editing={ctx.editing} />;
  const pct = ctx.kpis.compliancePct;
  return (
    <KpiInner
      title={t('dashboard.compliance')}
      value={pct === 0 ? '—' : formatPercent(pct)}
      hint={pct === 0 ? 'Activa modo Envelope' : ''}
      icon={TrendingUp}
      tone={pct > 1 ? 'destructive' : 'default'}
      navigateTo={`/budget`}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 11. Unallocated (envelope)
// =============================================================================
export function KpiUnallocatedWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return <LoadingShell title={t('dashboard.unallocated')} editing={ctx.editing} />;
  return (
    <KpiInner
      title={t('dashboard.unallocated')}
      value={formatCurrency(ctx.kpis.unallocated, {
        currency: ctx.currency,
        compact: true,
      })}
      hint="Cada peso necesita un trabajo"
      icon={PiggyBank}
      tone={ctx.envelopeMode && ctx.kpis.unallocated > 0 ? 'info' : 'default'}
      navigateTo={`/budget`}
      editing={ctx.editing}
      onRemove={onRemove}
    />
  );
}

// =============================================================================
// 12. HERO — Min required income with progress
// =============================================================================
export function KpiHeroWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return (
      <LoadingShell title="Hero" editing={ctx.editing} onRemove={onRemove} />
    );
  const { totalIncome, minRequiredIncome, deficit, surplus, hasDeficit } = ctx.kpis;
  const progress =
    minRequiredIncome > 0
      ? Math.min((totalIncome / minRequiredIncome) * 100, 100)
      : 0;

  return (
    <WidgetShell editing={ctx.editing} onRemove={onRemove}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full flex-col justify-between gap-3"
      >
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('dashboard.hero_question')}
          </p>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight md:text-4xl">
              {formatCurrency(minRequiredIncome, { currency: ctx.currency })}
            </span>
            {hasDeficit ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                Déficit: {formatCurrency(deficit, { currency: ctx.currency })}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Excedente: {formatCurrency(surplus, { currency: ctx.currency })}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Ingreso actual:{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(totalIncome, { currency: ctx.currency })}
              </span>
            </span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2"
            indicatorClassName={
              hasDeficit
                ? 'bg-gradient-to-r from-red-500 to-amber-500'
                : 'bg-gradient-to-r from-emerald-500 to-sky-500'
            }
          />
        </div>
      </motion.div>
    </WidgetShell>
  );
}

// =============================================================================
// 13. Projection card
// =============================================================================
export function KpiProjectionWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  if (!ctx.kpis)
    return (
      <LoadingShell
        title={t('dashboard.projection')}
        editing={ctx.editing}
        onRemove={onRemove}
      />
    );
  return (
    <WidgetShell
      title={t('dashboard.projection')}
      editing={ctx.editing}
      onRemove={onRemove}
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Ingreso
          </p>
          <p className="text-sm font-bold tabular-nums">
            {formatCurrency(ctx.kpis.projectedIncome, {
              currency: ctx.currency,
              compact: true,
            })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Gasto
          </p>
          <p className="text-sm font-bold tabular-nums">
            {formatCurrency(ctx.kpis.projectedExpense, {
              currency: ctx.currency,
              compact: true,
            })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Balance
          </p>
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              ctx.kpis.projectedBalance >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {formatCurrency(ctx.kpis.projectedBalance, {
              currency: ctx.currency,
              compact: true,
            })}
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
