import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiggyBank, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { useExpenses } from '@/features/expenses/hooks/use-expenses';
import { useHouseholdKpis } from '@/features/dashboard/hooks/use-household-kpis';
import { buildEnvelopeSummary } from '@/lib/finance/envelopes';
import { formatCurrency } from '@/lib/format';
import { getMonthBounds, toISODate } from '@/lib/date';

export function BudgetPage() {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const householdId = activeHousehold?.id ?? '';
  const currency = activeHousehold?.currency;
  const envelopeOn = activeHousehold?.envelope_mode_enabled;

  const { start, end } = getMonthBounds(new Date());
  const { data: categories, isLoading: lCat } = useCategories(householdId, 'expense');
  const { data: expenses, isLoading: lExp } = useExpenses(
    activeHousehold
      ? { householdId, from: toISODate(start), to: toISODate(end) }
      : null,
  );
  const { data: kpis } = useHouseholdKpis(householdId);

  const summary = useMemo(() => {
    if (!categories) return null;
    const spentByCat = new Map<string, number>();
    expenses?.forEach((e) => {
      if (!e.category_id) return;
      spentByCat.set(
        e.category_id,
        (spentByCat.get(e.category_id) ?? 0) + Number(e.amount),
      );
    });
    return buildEnvelopeSummary(
      kpis?.totalIncome ?? 0,
      categories
        .filter((c) => c.monthly_budget != null && Number(c.monthly_budget) > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          monthlyBudget: Number(c.monthly_budget),
          rolloverEnabled: c.rollover_enabled,
          spent: spentByCat.get(c.id) ?? 0,
        })),
    );
  }, [categories, expenses, kpis]);

  const loading = lCat || lExp;

  if (!envelopeOn) {
    return (
      <>
        <PageHeader title={t('nav.budget')} description={t('budget.envelope_inactive')} />
        <Card className="border-border bg-secondary">
          <CardContent className="flex items-start gap-4 p-6">
            <PiggyBank className="h-6 w-6 shrink-0 text-muted-foreground" />
            <div className="space-y-2">
              <p className="font-semibold">{t('budget.enable_hint')}</p>
              <p className="text-sm text-muted-foreground">{t('budget.description')}</p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('nav.budget')}
        description={t('budget.description')}
      />

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!loading && summary && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label={t('budget.month_income')}
              value={formatCurrency(summary.totalIncome, { currency })}
            />
            <StatCard
              label={t('budget.allocated')}
              value={formatCurrency(summary.totalAllocated, { currency })}
            />
            <StatCard
              label={t('budget.unallocated')}
              value={formatCurrency(summary.unallocated, { currency })}
              highlight={summary.unallocated > 0 ? 'warning' : 'success'}
            />
          </div>

          {summary.buckets.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title={t('empty.budget_categories_title')}
              description={t('empty.budget_categories_description')}
            />
          ) : (
            <div className="space-y-3">
              {summary.buckets.map((b) => {
                const pct = Math.min(b.utilizationRatio * 100, 100);
                const tone =
                  b.status === 'over'
                    ? 'bg-destructive'
                    : b.status === 'warning'
                      ? 'bg-warning'
                      : 'bg-primary';
                return (
                  <Card key={b.category.id}>
                    <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: b.category.color }}
                            />
                            <p className="font-medium">{b.category.name}</p>
                            {b.category.rolloverEnabled && (
                              <Badge variant="outline">Rollover</Badge>
                            )}
                          </div>
                          <p className="text-sm font-semibold">
                            {formatCurrency(
                              b.category.spent,
                              { currency },
                            )}
                            <span className="text-muted-foreground">
                              {' '}
                              / {formatCurrency(b.effectiveBudget, { currency })}
                            </span>
                          </p>
                        </div>
                        <Progress
                          value={pct}
                          indicatorClassName={tone}
                          className="h-2"
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {(b.utilizationRatio * 100).toFixed(0)}% gastado
                          </span>
                          {b.status === 'over' && (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3 w-3" />
                              Sobre presupuesto en{' '}
                              {formatCurrency(Math.abs(b.remaining), { currency })}
                            </span>
                          )}
                          {b.status !== 'over' && (
                            <span className="text-muted-foreground">
                              Disponible:{' '}
                              {formatCurrency(b.remaining, { currency })}
                            </span>
                          )}
                        </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'warning' | 'success';
}) {
  const cls =
    highlight === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : highlight === 'success'
        ? 'text-emerald-600 dark:text-emerald-400'
        : '';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-xl font-bold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
