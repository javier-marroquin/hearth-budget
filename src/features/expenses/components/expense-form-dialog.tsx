import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/money-input';
import { CategorySelect } from '@/components/forms/category-select';
import { expenseSchema, type ExpenseInput } from '@/schemas/expense.schema';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import type {
  ExpenseRow,
  ExpenseType,
  SplitMethod,
} from '@/lib/db/aliases';
import { toISODate } from '@/lib/date';
import { useCreateExpense, useUpdateExpense } from '../hooks/use-expenses';
import { splitExpense, type SplitParticipant } from '@/lib/finance/splits';
import { formatCurrency } from '@/lib/format';

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseRow | null;
}

const EXPENSE_TYPES: ExpenseType[] = ['fixed', 'variable', 'debt', 'one_time'];
const SPLIT_METHODS: SplitMethod[] = ['equal', 'percentage', 'income_based', 'custom'];

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: ExpenseFormDialogProps) {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { data: members } = useHouseholdMembers(activeHousehold?.id);
  const create = useCreateExpense(activeHousehold?.id ?? '');
  const update = useUpdateExpense(activeHousehold?.id ?? '');

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      currency: activeHousehold?.currency ?? 'COP',
      date: toISODate(new Date()),
      due_date: null,
      category_id: null,
      type: 'variable',
      split_method: 'equal',
      description: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        amount: Number(expense.amount),
        currency: expense.currency,
        date: expense.date,
        due_date: expense.due_date,
        category_id: expense.category_id,
        type: expense.type,
        status: expense.status,
        split_method: expense.split_method,
        description: expense.description ?? '',
        notes: expense.notes ?? '',
      });
    } else {
      form.reset({
        amount: 0,
        currency: activeHousehold?.currency ?? 'COP',
        date: toISODate(new Date()),
        due_date: null,
        category_id: null,
        type: 'variable',
        split_method: 'equal',
        description: '',
        notes: '',
      });
    }
  }, [expense, form, activeHousehold]);

  const watchAmount = form.watch('amount');
  const watchSplitMethod = form.watch('split_method');

  const activeMembers = useMemo(
    () => members?.filter((m) => m.status === 'active' && m.user_id) ?? [],
    [members],
  );

  const previewSplits = useMemo(() => {
    const participants: SplitParticipant[] = activeMembers.map((m) => ({
      userId: m.user_id!,
    }));
    return splitExpense(
      watchAmount ?? 0,
      participants,
      watchSplitMethod ?? 'equal',
    );
  }, [watchAmount, watchSplitMethod, activeMembers]);

  const onSubmit = async (values: ExpenseInput) => {
    const participants: SplitParticipant[] = activeMembers.map((m) => ({
      userId: m.user_id!,
    }));
    if (expense) {
      await update.mutateAsync({ id: expense.id, patch: values });
    } else {
      await create.mutateAsync({
        input: values,
        split: { method: values.split_method ?? 'equal', participants },
      });
    }
    onOpenChange(false);
  };

  const submitting = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {expense ? t('expenses.edit_title') : t('expenses.new_title')}
          </DialogTitle>
          <DialogDescription>
            Registra un gasto del hogar. Los gastos pueden dividirse entre miembros.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('expenses.description_placeholder')}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_TYPES.map((tp) => (
                          <SelectItem key={tp} value={tp}>
                            {t(`expenses.type.${tp}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha límite</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <CategorySelect
                      value={field.value ?? null}
                      onChange={field.onChange}
                      type="expense"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="split_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>División</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? 'equal'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPLIT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {t(`expenses.split.${m}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {previewSplits.length > 0 && watchAmount > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <p className="mb-2 font-medium">{t('expenses.split_preview')}</p>
                <ul className="space-y-1">
                  {previewSplits.map((s) => {
                    const m = activeMembers.find((mm) => mm.user_id === s.userId);
                    return (
                      <li key={s.userId} className="flex justify-between">
                        <span>{m?.profile?.full_name ?? m?.profile?.email ?? '—'}</span>
                        <span className="font-mono">
                          {formatCurrency(s.amount, {
                            currency: form.getValues('currency'),
                          })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
