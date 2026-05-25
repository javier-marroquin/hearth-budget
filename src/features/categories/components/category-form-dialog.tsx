import { useEffect } from 'react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/forms/money-input';
import { categorySchema, type CategoryInput } from '@/schemas/category.schema';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useCreateCategory, useUpdateCategory } from '../hooks/use-categories';
import type { CategoryRow, CategoryType } from '@/lib/supabase/database.types';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryRow | null;
  defaultType?: CategoryType;
}

const TYPES: CategoryType[] = ['expense', 'income', 'savings'];
const COLORS = [
  '#0ea5e9', '#22c55e', '#f97316', '#ef4444', '#a855f7',
  '#ec4899', '#eab308', '#06b6d4', '#8b5cf6', '#64748b',
];

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  defaultType = 'expense',
}: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const create = useCreateCategory(activeHousehold?.id ?? '');
  const update = useUpdateCategory(activeHousehold?.id ?? '');

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: defaultType,
      color: '#0ea5e9',
      icon: 'tag',
      monthly_budget: null,
      rollover_enabled: false,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
        monthly_budget: category.monthly_budget,
        rollover_enabled: category.rollover_enabled,
      });
    } else {
      form.reset({
        name: '',
        type: defaultType,
        color: '#0ea5e9',
        icon: 'tag',
        monthly_budget: null,
        rollover_enabled: false,
      });
    }
  }, [category, defaultType, form]);

  const onSubmit = async (values: CategoryInput) => {
    if (category) {
      await update.mutateAsync({ id: category.id, patch: values });
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
          <DialogTitle>{category ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            Si activas el modo Envelope (en Configuración), el presupuesto mensual se usa para calcular cumplimiento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Mascotas" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
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
                        {TYPES.map((tp) => (
                          <SelectItem key={tp} value={tp}>
                            {tp === 'expense' && t('expenses.title')}
                            {tp === 'income' && t('incomes.title')}
                            {tp === 'savings' && 'Ahorro'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-1.5">
                        {COLORS.map((c) => (
                          <button
                            type="button"
                            key={c}
                            onClick={() => field.onChange(c)}
                            aria-label={c}
                            className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                            style={{
                              backgroundColor: c,
                              borderColor:
                                field.value === c ? 'hsl(var(--ring))' : 'transparent',
                            }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="monthly_budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Presupuesto mensual (opcional)</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value ?? undefined}
                      onChange={(v) => field.onChange(v || null)}
                    />
                  </FormControl>
                  <FormDescription>
                    Cuando se activa el modo Envelope, se compara con el gasto real.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rollover_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Arrastrar saldo (rollover)</FormLabel>
                    <FormDescription className="text-xs">
                      Si sobra o falta presupuesto, se arrastra al siguiente mes.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
