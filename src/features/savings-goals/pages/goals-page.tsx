import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MoneyInput } from '@/components/forms/money-input';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import {
  useAddToGoal,
  useCreateGoal,
  useDeleteGoal,
  useGoals,
} from '../hooks/use-goals';
import { monthlyGoalTarget } from '@/lib/finance/recurrence';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePermissions } from '@/hooks/use-permissions';
import type { SavingsGoalRow } from '@/lib/db/aliases';

const goalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  target_amount: z.number().min(1),
  target_date: z.string().nullable().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});
type GoalInput = z.infer<typeof goalSchema>;

export function GoalsPage() {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const householdId = activeHousehold?.id ?? '';
  const { canWriteExpenses } = usePermissions();

  const { data: goals, isLoading } = useGoals(householdId);
  const create = useCreateGoal(householdId);
  const addTo = useAddToGoal(householdId);
  const remove = useDeleteGoal(householdId);

  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SavingsGoalRow | null>(null);

  const form = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: '', target_amount: 0, target_date: null, notes: '' },
  });

  const onSubmit = async (values: GoalInput) => {
    await create.mutateAsync(values);
    form.reset();
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title={t('nav.goals')}
        actions={
          canWriteExpenses && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('goals.create')}
            </Button>
          )
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      )}

      {!isLoading && (!goals || goals.length === 0) && (
        <EmptyState
          icon={Target}
          title={t('empty.goals_title')}
          description={t('empty.goals_description')}
        />
      )}

      {goals && goals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const targetAmount = Number(g.target_amount);
            const currentAmount = Number(g.current_amount);
            const ratio =
              targetAmount > 0
                ? Math.min((currentAmount / targetAmount) * 100, 100)
                : 0;
            const monthly = monthlyGoalTarget(
              targetAmount,
              currentAmount,
              g.target_date,
            );
            const currency = activeHousehold?.currency;
            return (
              <div key={g.id}>
                <Card>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{g.name}</h3>
                        {g.target_date && (
                          <p className="text-xs text-muted-foreground">
                            {t('goals.target_date_label', { date: formatDate(g.target_date) })}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={g.status === 'completed' ? 'success' : 'outline'}
                      >
                        {g.status === 'completed'
                          ? t('status.completed')
                          : g.status === 'paused'
                            ? t('status.paused')
                            : t('status.active')}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">
                          {formatCurrency(currentAmount, { currency })}
                        </span>
                        <span className="text-muted-foreground">
                          / {formatCurrency(targetAmount, { currency })}
                        </span>
                      </div>
                      <Progress value={ratio} indicatorClassName="bg-primary" />
                      <p className="text-xs text-muted-foreground">
                        {t('goals.percent_complete', { percent: ratio.toFixed(0) })}
                      </p>
                    </div>

                    {monthly && monthly > 0 && g.status === 'active' && (
                      <div className="flex items-center gap-2 rounded-lg bg-secondary p-2 text-[13px]">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">
                          {t('goals.suggested_monthly', {
                            amount: formatCurrency(monthly, { currency }),
                          })}
                        </span>
                      </div>
                    )}

                    {canWriteExpenses && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const v = prompt(t('goals.add_balance_prompt'), '0');
                            const n = Number(v);
                            if (n > 0) addTo.mutate({ id: g.id, delta: n });
                          }}
                        >
                          {t('goals.add_balance')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(g)}
                          aria-label={t('aria.delete')}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('goals.new_title')}</DialogTitle>
            <DialogDescription>{t('goals.new_description')}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('goals.name_label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('goals.name_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('goals.target_amount')}</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('goals.target_date_optional')}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormDescription>{t('goals.target_date_hint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('goals.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? t('goals.saving') : t('goals.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('delete.goal_title')}
        description={t('delete.goal_progress')}
        destructive
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}
