import { z } from 'zod';

export const calendarEventTypeEnum = z.enum([
  'expense',
  'income',
  'contribution',
  'goal',
  'reminder',
]);
export const calendarEventStatusEnum = z.enum([
  'pending',
  'paid',
  'overdue',
  'recurring',
  'contribution',
  'savings',
  'completed',
]);

export const calendarEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  event_type: calendarEventTypeEnum,
  status: calendarEventStatusEnum,
  start_at: z.string().min(1, { message: 'Selecciona fecha' }),
  end_at: z.string().nullable().optional(),
  all_day: z.boolean(),
  amount: z.number().min(0).nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
});

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
