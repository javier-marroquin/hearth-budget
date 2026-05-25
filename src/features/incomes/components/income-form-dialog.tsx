import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { MoneyInput } from '@/components/forms/money-input';
import { CategorySelect } from '@/components/forms/category-select';
import { MemberSelect } from '@/components/forms/member-select';
import { incomeSchema, type IncomeInput } from '@/schemas/income.schema';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import type { IncomeRow } from '@/lib/supabase/database.types';
import { toISODate } from '@/lib/date';
import { useCreateIncome, useUpdateIncome } from '../hooks/use-incomes';

interface IncomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: IncomeRow | null;
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  income,
}: IncomeFormDialogProps) {
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const create = useCreateIncome(activeHousehold?.id ?? '');
  const update = useUpdateIncome(activeHousehold?.id ?? '');

  const form = useForm<IncomeInput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      user_id: '',
      amount: 0,
      currency: activeHousehold?.currency ?? 'COP',
      date: toISODate(new Date()),
      category_id: null,
      source: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (income) {
      form.reset({
        user_id: income.user_id,
        amount: Number(income.amount),
        currency: income.currency,
        date: income.date,
        category_id: income.category_id,
        source: income.source ?? '',
        notes: income.notes ?? '',
      });
    } else {
      form.reset({
        user_id: '',
        amount: 0,
        currency: activeHousehold?.currency ?? 'COP',
        date: toISODate(new Date()),
        category_id: null,
        source: '',
        notes: '',
      });
    }
  }, [income, form, activeHousehold]);

  const onSubmit = async (values: IncomeInput) => {
    if (income) {
      await update.mutateAsync({ id: income.id, patch: values });
    } else {
      await create.mutateAsync(values);
    }
    onOpenChange(false);
  };

  const submitting = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{income ? 'Editar ingreso' : 'Nuevo ingreso'}</DialogTitle>
          <DialogDescription>
            Registra un ingreso percibido por un miembro del hogar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perceptor</FormLabel>
                  <FormControl>
                    <MemberSelect value={field.value} onChange={field.onChange} />
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
                      type="income"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Empresa X, freelance, propinas…"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
