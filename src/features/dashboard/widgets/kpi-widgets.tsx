import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  default: 'bg-secondary text-muted-foreground',
  success: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-primary/10 text-primary',
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
      contentClassName="flex min-h-0 flex-1 flex-col justify-between py-0.5"
    >
      <div className="flex h-full min-h-0 flex-col justify-between gap-1">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-md',
            TONE_BG[tone],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-lg font-bold leading-none tabular-nums tracking-tight">
          {value}
        </p>
        {hint ? (
          <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
            {hint}
          </p>
        ) : (
          <span className="block h-[14px]" aria-hidden />
        )}
      </div>
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
  const over = ctx.kpis.totalExpensePaid > ctx.kpis.totalIncome;
  const pendingHint =
    ctx.kpis.totalExpensePending > 0
      ? t('dashboard.expense_pending_hint', {
          committed: formatCurrency(ctx.kpis.totalExpenseCommitted, {
            currency: ctx.currency,
            compact: true,
          }),
          pending: formatCurrency(ctx.kpis.totalExpensePending, {
            currency: ctx.currency,
            compact: true,
          }),
        })
      : undefined;
  return (
    <KpiInner
      title={t('dashboard.total_expense_paid')}
      value={formatCurrency(ctx.kpis.totalExpensePaid, {
        currency: ctx.currency,
        compact: true,
      })}
      hint={pendingHint}
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
  const { t } = useTranslation();
  if (!ctx.kpis)
    return (
      <LoadingShell title={t('dashboard.actual_savings')} editing={ctx.editing} />
    );
  return (
    <KpiInner
      title={t('dashboard.actual_savings')}
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
      <div className="flex h-full flex-col justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('dashboard.hero_question')}
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight sm:text-2xl">
              {formatCurrency(minRequiredIncome, { currency: ctx.currency })}
            </span>
            {hasDeficit ? (
              <span className="rounded-lg bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                Déficit: {formatCurrency(deficit, { currency: ctx.currency })}
              </span>
            ) : (
              <span className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
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
            indicatorClassName={hasDeficit ? 'bg-destructive' : 'bg-primary'}
          />
        </div>
      </div>
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
              ctx.kpis.projectedBalance >= 0 ? 'text-primary' : 'text-destructive',
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
