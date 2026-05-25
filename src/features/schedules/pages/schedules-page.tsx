import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useExpenses } from '@/features/expenses/hooks/use-expenses';
import { useContributions } from '@/features/contributions/hooks/use-contributions';
import { formatCurrency, formatDate, formatRelative } from '@/lib/format';
import { daysUntil, isOverdue, isUpcoming } from '@/lib/date';

/**
 * The "schedules" view (inspired by Actual Budget) lists all upcoming
 * pre-planned cash flows: expenses with a due date + contributions with an
 * expected date. Provides a quick "what's next" overview.
 */
export function SchedulesPage() {
  const { t, i18n } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const householdId = activeHousehold?.id ?? '';
  const currency = activeHousehold?.currency;

  const { data: expenses, isLoading: lExp } = useExpenses(
    activeHousehold ? { householdId, status: 'pending' } : null,
  );
  const { data: contributions, isLoading: lCon } = useContributions(
    activeHousehold ? { householdId, status: 'pending' } : null,
  );

  const items = useMemo(() => {
    const list: Array<{
      id: string;
      kind: 'expense' | 'contribution';
      title: string;
      date: string;
      amount: number;
      overdue: boolean;
      upcoming: boolean;
      currency: string;
    }> = [];

    expenses?.forEach((e) => {
      const dueDate = e.due_date ?? e.date;
      list.push({
        id: e.id,
        kind: 'expense',
        title: e.description ?? 'Gasto',
        date: dueDate,
        amount: Number(e.amount),
        overdue: isOverdue(dueDate),
        upcoming: isUpcoming(dueDate, 7),
        currency: e.currency,
      });
    });
    contributions?.forEach((c) => {
      list.push({
        id: c.id,
        kind: 'contribution',
        title: 'Aporte de miembro',
        date: c.expected_date,
        amount: Number(c.amount),
        overdue: isOverdue(c.expected_date),
        upcoming: isUpcoming(c.expected_date, 7),
        currency: c.currency,
      });
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses, contributions]);

  const loading = lExp || lCon;

  return (
    <>
      <PageHeader
        title={t('nav.schedules')}
        description="Pagos pendientes y aportes esperados del hogar."
      />

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="Sin pagos programados"
          description="Crea gastos con fecha límite y aportes esperados. Aparecerán aquí ordenados por fecha."
        />
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <Card key={`${it.kind}-${it.id}`}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-md text-white ${
                    it.kind === 'contribution' ? 'bg-sky-500' : 'bg-amber-500'
                  }`}
                >
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(it.date, 'PPP', i18n.language)}{' '}
                    <span className="opacity-60">
                      ({formatRelative(it.date, i18n.language)})
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {it.overdue && <Badge variant="destructive">Vencido</Badge>}
                {!it.overdue && it.upcoming && (
                  <Badge variant="warning">
                    En {daysUntil(it.date)} días
                  </Badge>
                )}
                <span className="font-semibold">
                  {formatCurrency(it.amount, { currency: it.currency ?? currency })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
