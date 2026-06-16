import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/forms/money-input';
import { MemberSelect } from '@/components/forms/member-select';
import {
  calendarEventSchema,
  type CalendarEventInput,
} from '@/schemas/calendar.schema';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from '../hooks/use-calendar-events';
import type {
  CalendarEventRow,
  CalendarEventStatus,
  CalendarEventType,
} from '@/lib/db/aliases';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEventRow | null;
  defaultStartAt?: string;
}

const EVENT_TYPES: CalendarEventType[] = [
  'expense',
  'income',
  'contribution',
  'goal',
  'reminder',
];
const STATUS_VALUES: CalendarEventStatus[] = [
  'pending',
  'paid',
  'overdue',
  'recurring',
  'contribution',
  'savings',
  'completed',
];

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  defaultStartAt,
}: EventFormDialogProps) {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const create = useCreateCalendarEvent(activeHousehold?.id ?? '');
  const update = useUpdateCalendarEvent(activeHousehold?.id ?? '');
  const remove = useDeleteCalendarEvent(activeHousehold?.id ?? '');

  const form = useForm<CalendarEventInput>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: {
      title: '',
      description: '',
      event_type: 'expense',
      status: 'pending',
      start_at: defaultStartAt ?? new Date().toISOString().slice(0, 16),
      end_at: null,
      all_day: true,
      amount: null,
      user_id: null,
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description ?? '',
        event_type: event.event_type,
        status: event.status,
        start_at: event.start_at.slice(0, 16),
        end_at: event.end_at?.slice(0, 16) ?? null,
        all_day: event.all_day,
        amount: event.amount ? Number(event.amount) : null,
        user_id: event.user_id,
      });
    } else if (defaultStartAt) {
      form.reset({
        title: '',
        description: '',
        event_type: 'expense',
        status: 'pending',
        start_at: defaultStartAt,
        end_at: null,
        all_day: true,
        amount: null,
        user_id: null,
      });
    }
  }, [event, defaultStartAt, form]);

  const onSubmit = async (values: CalendarEventInput) => {
    if (!activeHousehold) return;
    const payload = {
      household_id: activeHousehold.id,
      title: values.title,
      description: values.description ?? null,
      event_type: values.event_type,
      status: values.status,
      start_at: new Date(values.start_at).toISOString(),
      end_at: values.end_at ? new Date(values.end_at).toISOString() : null,
      all_day: values.all_day,
      amount: values.amount ?? null,
      user_id: values.user_id ?? null,
    };
    if (event) {
      await update.mutateAsync({ id: event.id, patch: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const onDelete = async () => {
    if (!event) return;
    await remove.mutateAsync(event.id);
    onOpenChange(false);
  };

  const submitting = create.isPending || update.isPending;
  const allDay = form.watch('all_day');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {event ? t('calendar.edit_event') : t('calendar.new_event')}
          </DialogTitle>
          <DialogDescription>{t('calendar.form_description')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('calendar.title')}</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder={t('calendar.title_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.type_label')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_TYPES.map((tp) => (
                          <SelectItem key={tp} value={tp}>
                            {t(`calendar.event_type.${tp}`)}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.status_label')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_VALUES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`calendar.status.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="all_day"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
                  <FormLabel>{t('calendar.all_day')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.start')}</FormLabel>
                    <FormControl>
                      <Input
                        type={allDay ? 'date' : 'datetime-local'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.end_optional')}</FormLabel>
                    <FormControl>
                      <Input
                        type={allDay ? 'date' : 'datetime-local'}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.amount_optional')}</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value ?? undefined}
                        onChange={(v) => field.onChange(v || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.assignee')}</FormLabel>
                    <FormControl>
                      <MemberSelect
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        placeholder={t('calendar.unassigned')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('calendar.description')}</FormLabel>
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

            <DialogFooter className="sm:justify-between">
              {event && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('calendar.delete_event')}
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t('calendar.saving') : t('common.save')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
