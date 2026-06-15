import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  Receipt,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useExpenses } from '@/features/expenses/hooks/use-expenses';
import { useContributions } from '@/features/contributions/hooks/use-contributions';
import {
  useDeleteRecurringTemplate,
  useMaterializeRecurring,
  useRecurringTemplates,
  useToggleRecurringTemplate,
} from '@/features/recurring/hooks/use-recurring-templates';
import { FixedItemFormDialog } from '@/features/recurring/components/fixed-item-form-dialog';
import type { RecurringTemplateRow } from '@/features/recurring/services/recurring-templates.service';
import { formatCurrency, formatDate, formatRelative } from '@/lib/format';
import { daysUntil, isOverdue, isUpcoming } from '@/lib/date';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePermissions } from '@/hooks/use-permissions';

function frequencyLabel(
  t: (key: string) => string,
  template: RecurringTemplateRow,
): string {
  const freq = template.recurring_rules?.frequency;
  if (freq === 'weekly') return t('recurring.freq_weekly');
  if (freq === 'biweekly') return t('recurring.freq_biweekly');
  if (freq === 'monthly') return t('recurring.freq_monthly');
  return freq ?? '—';
}

export function SchedulesPage() {
  const { t, i18n } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { canWriteIncomes, canWriteExpenses } = usePermissions();
  const canManageFixed = canWriteIncomes || canWriteExpenses;
  const householdId = activeHousehold?.id ?? '';
  const currency = activeHousehold?.currency;

  const { data: templates, isLoading: loadingTemplates } =
    useRecurringTemplates(householdId);
  const materialize = useMaterializeRecurring(householdId);
  const toggle = useToggleRecurringTemplate(householdId);
  const remove = useDeleteRecurringTemplate(householdId);

  const { data: expenses, isLoading: lExp } = useExpenses(
    activeHousehold ? { householdId, status: 'pending' } : null,
  );
  const { data: contributions, isLoading: lCon } = useContributions(
    activeHousehold ? { householdId, status: 'pending' } : null,
  );

  const [fixedOpen, setFixedOpen] = useState(false);
  const [fixedKind, setFixedKind] = useState<'income' | 'expense'>('expense');
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplateRow | null>(null);
  const [toDelete, setToDelete] = useState<RecurringTemplateRow | null>(null);

  const pendingItems = useMemo(() => {
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

  const loadingPending = lExp || lCon;

  const openNewFixed = (kind: 'income' | 'expense') => {
    setEditingTemplate(null);
    setFixedKind(kind);
    setFixedOpen(true);
  };

  const openEditFixed = (tpl: RecurringTemplateRow) => {
    setEditingTemplate(tpl);
    setFixedOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t('nav.schedules')}
        description={t('recurring.page_description')}
        actions={
          canManageFixed && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openNewFixed('income')}>
                <Wallet className="h-4 w-4" />
                {t('recurring.add_income')}
              </Button>
              <Button size="sm" onClick={() => openNewFixed('expense')}>
                <Plus className="h-4 w-4" />
                {t('recurring.add_expense')}
              </Button>
            </div>
          )
        }
      />

      <FixedItemFormDialog
        open={fixedOpen}
        onOpenChange={(open) => {
          setFixedOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        defaultKind={fixedKind}
        template={editingTemplate}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('recurring.delete_title')}
        description={t('recurring.delete_description', { name: toDelete?.label })}
        onConfirm={async () => {
          if (toDelete) await remove.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />

      <Tabs defaultValue="fixed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fixed">{t('recurring.tab_fixed')}</TabsTrigger>
          <TabsTrigger value="pending">{t('recurring.tab_pending')}</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={materialize.isPending}
              onClick={() => materialize.mutate()}
            >
              <RefreshCw
                className={`h-4 w-4 ${materialize.isPending ? 'animate-spin' : ''}`}
              />
              {t('recurring.sync_now')}
            </Button>
          </div>

          {loadingTemplates && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {!loadingTemplates && (!templates || templates.length === 0) && (
            <EmptyState
              icon={CalendarClock}
              title={t('recurring.empty_title')}
              description={t('recurring.empty_description')}
            />
          )}

          {templates?.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      tpl.kind === 'income'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {tpl.kind === 'income' ? (
                      <Wallet className="h-5 w-5" />
                    ) : (
                      <Receipt className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{tpl.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {tpl.kind === 'income' ? t('recurring.kind_income') : t('recurring.kind_expense')}{' '}
                      · {frequencyLabel(t, tpl)}
                      {tpl.recurring_rules?.start_date
                        ? ` · ${t('recurring.since')} ${formatDate(tpl.recurring_rules.start_date, 'PP', i18n.language)}`
                        : ''}
                      {tpl.recurring_rules?.end_date
                        ? ` · ${t('recurring.until')} ${formatDate(tpl.recurring_rules.end_date, 'PP', i18n.language)}`
                        : ` · ${t('recurring.no_end_date')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!tpl.active && <Badge variant="secondary">{t('recurring.paused_badge')}</Badge>}
                  <span className="font-semibold">
                    {formatCurrency(Number(tpl.amount), { currency: tpl.currency ?? currency })}
                  </span>
                  {canManageFixed && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        title={t('common.edit')}
                        onClick={() => openEditFixed(tpl)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title={tpl.active ? t('recurring.pause') : t('recurring.resume')}
                        onClick={() =>
                          toggle.mutate({ id: tpl.id, active: !tpl.active })
                        }
                      >
                        {tpl.active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title={t('common.delete')}
                        onClick={() => setToDelete(tpl)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-2">
          {loadingPending && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!loadingPending && pendingItems.length === 0 && (
            <EmptyState
              icon={CalendarClock}
              title={t('recurring.pending_empty_title')}
              description={t('recurring.pending_empty_description')}
            />
          )}

          {pendingItems.map((it) => (
            <Card key={`${it.kind}-${it.id}`}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      it.kind === 'contribution'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-warning/10 text-warning'
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
                  {it.overdue && <Badge variant="destructive">{t('recurring.overdue')}</Badge>}
                  {!it.overdue && it.upcoming && (
                    <Badge variant="warning">
                      {t('recurring.in_days', { days: daysUntil(it.date) })}
                    </Badge>
                  )}
                  <span className="font-semibold">
                    {formatCurrency(it.amount, { currency: it.currency ?? currency })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}
