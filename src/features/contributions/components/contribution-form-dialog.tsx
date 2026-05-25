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
import { MemberSelect } from '@/components/forms/member-select';
import {
  contributionSchema,
  type ContributionInput,
} from '@/schemas/contribution.schema';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import type { ContributionRow } from '@/lib/supabase/aliases';
import { toISODate } from '@/lib/date';
import {
  useCreateContribution,
  useUpdateContribution,
} from '../hooks/use-contributions';

interface ContributionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribution?: ContributionRow | null;
}

export function ContributionFormDialog({
  open,
  onOpenChange,
  contribution,
}: ContributionFormDialogProps) {
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const create = useCreateContribution(activeHousehold?.id ?? '');
  const update = useUpdateContribution(activeHousehold?.id ?? '');

  const form = useForm<ContributionInput>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      user_id: '',
      amount: 0,
      currency: activeHousehold?.currency ?? 'COP',
      expected_date: toISODate(new Date()),
      received_date: null,
      notes: '',
    },
  });

  useEffect(() => {
    if (contribution) {
      form.reset({
        user_id: contribution.user_id,
        amount: Number(contribution.amount),
        currency: contribution.currency,
        expected_date: contribution.expected_date,
        received_date: contribution.received_date,
        notes: contribution.notes ?? '',
      });
    } else {
      form.reset({
        user_id: '',
        amount: 0,
        currency: activeHousehold?.currency ?? 'COP',
        expected_date: toISODate(new Date()),
        received_date: null,
        notes: '',
      });
    }
  }, [contribution, form, activeHousehold]);

  const onSubmit = async (values: ContributionInput) => {
    if (contribution) {
      await update.mutateAsync({ id: contribution.id, patch: values });
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
          <DialogTitle>
            {contribution ? 'Editar aporte' : 'Nuevo aporte'}
          </DialogTitle>
          <DialogDescription>
            Aporte mensual que un miembro hace al hogar (cuota, mesada, gasto compartido).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aportante</FormLabel>
                  <FormControl>
                    <MemberSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="expected_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha esperada</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="received_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha recibido</FormLabel>
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
