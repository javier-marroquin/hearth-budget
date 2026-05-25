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
import { MoneyInput } from '@/components/forms/money-input';
import { CategorySelect } from '@/components/forms/category-select';
import { MemberSelect } from '@/components/forms/member-select';
import {
  recurringTemplateSchema,
  type RecurringTemplateInput,
} from '@/schemas/recurring.schema';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { toISODate } from '@/lib/date';
import {
  useCreateRecurringTemplate,
  useUpdateRecurringTemplate,
} from '../hooks/use-recurring-templates';
import {
  templateToFormInput,
  type RecurringTemplateRow,
} from '../services/recurring-templates.service';

interface FixedItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKind?: 'income' | 'expense';
  template?: RecurringTemplateRow | null;
}

const FREQUENCIES = [
  { value: 'weekly', labelKey: 'recurring.freq_weekly' },
  { value: 'biweekly', labelKey: 'recurring.freq_biweekly' },
  { value: 'monthly', labelKey: 'recurring.freq_monthly' },
] as const;

function emptyDefaults(
  kind: 'income' | 'expense',
  userId: string,
): RecurringTemplateInput {
  return {
    kind,
    label: '',
    amount: 0,
    frequency: 'monthly',
    start_date: toISODate(new Date()),
    end_date: '',
    category_id: null,
    user_id: userId,
    source: '',
    expense_type: 'fixed',
    split_method: 'equal',
  };
}

export function FixedItemFormDialog({
  open,
  onOpenChange,
  defaultKind = 'expense',
  template = null,
}: FixedItemFormDialogProps) {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const user = useAuthStore((s) => s.user);
  const isEdit = Boolean(template);
  const householdId = activeHousehold?.id ?? '';
  const currency = activeHousehold?.currency ?? 'USD';

  const create = useCreateRecurringTemplate(householdId, currency);
  const update = useUpdateRecurringTemplate(householdId);

  const form = useForm<RecurringTemplateInput>({
    resolver: zodResolver(
      recurringTemplateSchema.refine(
        (data) => data.kind !== 'income' || Boolean(data.user_id),
        { message: t('recurring.member_required'), path: ['user_id'] },
      ),
    ),
    defaultValues: emptyDefaults(defaultKind, user?.id ?? ''),
  });

  const kind = form.watch('kind');
  const submitting = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (template) {
      form.reset(templateToFormInput(template));
    } else {
      form.reset(emptyDefaults(defaultKind, user?.id ?? ''));
    }
  }, [open, template, defaultKind, user?.id, form]);

  const onSubmit = async (values: RecurringTemplateInput) => {
    if (isEdit && template) {
      await update.mutateAsync({ id: template.id, input: values });
    } else {
      await create.mutateAsync(values);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('recurring.edit_title') : t('recurring.new_title')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('recurring.edit_subtitle') : t('recurring.new_subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recurring.kind')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">{t('recurring.kind_income')}</SelectItem>
                      <SelectItem value="expense">{t('recurring.kind_expense')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recurring.label')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        kind === 'income'
                          ? t('recurring.label_placeholder_income')
                          : t('recurring.label_placeholder_expense')
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {kind === 'income' && (
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('recurring.receiver')}</FormLabel>
                    <FormControl>
                      <MemberSelect value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('recurring.amount')}</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('recurring.frequency')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FREQUENCIES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {t(f.labelKey)}
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
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('recurring.start_date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('recurring.end_date')}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('recurring.end_date_hint')}</p>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recurring.category')}</FormLabel>
                  <FormControl>
                    <CategorySelect
                      value={field.value ?? null}
                      onChange={field.onChange}
                      type={kind === 'income' ? 'income' : 'expense'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {kind === 'income' && (
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('recurring.source')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('recurring.source_placeholder')}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? t('common.loading')
                  : isEdit
                    ? t('common.save')
                    : t('recurring.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
