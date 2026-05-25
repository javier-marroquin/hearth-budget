import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  DollarSign,
  HandCoins,
  PiggyBank,
  Receipt,
  Target,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/kpi/kpi-card';
import { HeroKpi } from '../components/hero-kpi';
import { IncomeVsExpenseLine } from '@/components/charts/income-vs-expense-line';
import { CategoryDoughnut } from '@/components/charts/category-doughnut';
import { ContributionsBar } from '@/components/charts/contributions-bar';
import { FixedVsVariableStacked } from '@/components/charts/fixed-vs-variable-stacked';
import { UpcomingTimeline } from '../components/upcoming-timeline';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useHouseholdKpis } from '../hooks/use-household-kpis';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import { formatCurrency, formatPercent } from '@/lib/format';

export function DashboardPage() {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const householdId = activeHousehold?.id;
  const currency = activeHousehold?.currency ?? 'COP';

  const { data: kpis, isLoading } = useHouseholdKpis(householdId);
  const { data: members } = useHouseholdMembers(householdId);

  const memberLookup = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => {
      if (!m.user_id) return;
      map.set(m.user_id, m.profile?.full_name ?? m.profile?.email ?? 'Miembro');
    });
    return map;
  }, [members]);

  if (isLoading || !kpis) {
    return (
      <>
        <PageHeader title={t('dashboard.title')} />
        <Skeleton className="h-44 w-full" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </>
    );
  }

  const noData =
    kpis.totalIncome === 0 &&
    kpis.totalExpense === 0 &&
    kpis.contributionsReceived === 0 &&
    kpis.contributionsPending === 0;

  return (
    <>
      <PageHeader title={t('dashboard.title')} />

      {/* Hero KPI: the main question of the app */}
      <HeroKpi
        actualIncome={kpis.totalIncome}
        minRequiredIncome={kpis.minRequiredIncome}
        deficit={kpis.deficit}
        surplus={kpis.surplus}
        currency={currency}
      />

      {/* Alerts */}
      {(kpis.belowSavingsTarget || kpis.overduePaymentsCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-2"
        >
          {kpis.belowSavingsTarget && kpis.totalIncome > 0 && (
            <Card className="border-amber-300/50 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>{t('alerts.savings_warning')}</span>
              </CardContent>
            </Card>
          )}
          {kpis.overduePaymentsCount > 0 && (
            <Card className="border-red-300/50 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20">
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span>{t('alerts.overdue_warning', { count: kpis.overduePaymentsCount })}</span>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {noData && (
        <div className="mt-6">
          <EmptyState
            icon={BarChart3}
            title="Aún no hay datos"
            description="Registra tus primeros ingresos, gastos y aportes para empezar a ver tus KPIs."
          />
        </div>
      )}

      {/* Primary KPIs (5 cards) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label={t('dashboard.total_income')}
          value={formatCurrency(kpis.totalIncome, { currency, compact: true })}
          icon={Wallet}
          tone="success"
          delay={0.05}
        />
        <KpiCard
          label={t('dashboard.total_expense')}
          value={formatCurrency(kpis.totalExpense, { currency, compact: true })}
          icon={Receipt}
          tone={kpis.totalExpense > kpis.totalIncome ? 'destructive' : 'default'}
          delay={0.1}
        />
        <KpiCard
          label={t('dashboard.balance')}
          value={formatCurrency(kpis.balance, { currency, compact: true })}
          icon={DollarSign}
          tone={kpis.balance >= 0 ? 'success' : 'destructive'}
          delay={0.15}
        />
        <KpiCard
          label={t('dashboard.savings_pct')}
          value={formatPercent(kpis.savingsRate)}
          hint={t('dashboard.min_savings') + ': 10%'}
          icon={PiggyBank}
          tone={kpis.belowSavingsTarget ? 'warning' : 'success'}
          delay={0.2}
        />
        <KpiCard
          label={t('dashboard.overdue_payments')}
          value={String(kpis.overduePaymentsCount)}
          hint={`${kpis.upcomingPaymentsCount} próximos`}
          icon={AlertTriangle}
          tone={kpis.overduePaymentsCount > 0 ? 'destructive' : 'default'}
          delay={0.25}
        />
      </div>

      {/* Upcoming timeline */}
      {householdId && (
        <div className="mt-6">
          <UpcomingTimeline
            householdId={householdId}
            currency={currency}
            windowDays={14}
          />
        </div>
      )}

      {/* Charts row 1: line trend full width */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.income_vs_expense')}</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeVsExpenseLine data={kpis.monthlyTrend} currency={currency} />
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: doughnut + stacked */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.by_category')}</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.expenseByCategory.length > 0 ? (
              <CategoryDoughnut data={kpis.expenseByCategory} currency={currency} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Sin gastos este mes
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.fixed_vs_variable')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FixedVsVariableStacked data={kpis.fixedVsVariable} currency={currency} />
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3: contributions */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.by_member')}</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.contributionsByMember.length > 0 ? (
              <ContributionsBar
                data={kpis.contributionsByMember.map((c) => ({
                  name: memberLookup.get(c.userId) ?? 'Miembro',
                  amount: c.amount,
                  pending: c.pending,
                }))}
                currency={currency}
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Sin aportes este mes
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs row */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label={t('dashboard.min_savings')}
          value={formatCurrency(kpis.minSavings, { currency, compact: true })}
          icon={Target}
          delay={0.3}
        />
        <KpiCard
          label="Ahorro real"
          value={formatCurrency(kpis.actualSavings, { currency, compact: true })}
          icon={PiggyBank}
          tone={kpis.actualSavings >= kpis.minSavings ? 'success' : 'warning'}
          delay={0.35}
        />
        <KpiCard
          label={t('dashboard.contributions_received')}
          value={formatCurrency(kpis.contributionsReceived, { currency, compact: true })}
          icon={HandCoins}
          tone="success"
          delay={0.4}
        />
        <KpiCard
          label={t('dashboard.contributions_pending')}
          value={formatCurrency(kpis.contributionsPending, { currency, compact: true })}
          icon={CalendarClock}
          tone={kpis.contributionsPending > 0 ? 'warning' : 'default'}
          delay={0.45}
        />
        <KpiCard
          label={t('dashboard.compliance')}
          value={
            kpis.compliancePct === 0 ? '—' : formatPercent(kpis.compliancePct)
          }
          hint={kpis.compliancePct === 0 ? 'Activa modo Envelope' : ''}
          icon={BarChart3}
          tone={kpis.compliancePct > 1 ? 'destructive' : 'default'}
          delay={0.5}
        />
      </div>

      {/* Projection row */}
      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t('dashboard.projection')}</CardTitle>
            <Badge variant="outline">Cierre mensual</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat
                label={t('dashboard.actual_income')}
                value={formatCurrency(kpis.projectedIncome, { currency })}
              />
              <Stat
                label={t('dashboard.total_expense')}
                value={formatCurrency(kpis.projectedExpense, { currency })}
              />
              <Stat
                label={t('dashboard.balance')}
                value={formatCurrency(kpis.projectedBalance, { currency })}
                tone={kpis.projectedBalance >= 0 ? 'success' : 'destructive'}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unallocated (envelope hint) */}
      {activeHousehold?.envelope_mode_enabled && (
        <div className="mt-6">
          <Card className="border-violet-300/50 bg-violet-50/40 dark:border-violet-900/40 dark:bg-violet-950/20">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium">{t('dashboard.unallocated')}</p>
                <p className="text-xs text-muted-foreground">
                  Cada peso necesita un trabajo asignado
                </p>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(kpis.unallocated, { currency })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'destructive';
}) {
  const cls =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'destructive'
        ? 'text-red-600 dark:text-red-400'
        : '';
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}
