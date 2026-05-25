import { z } from 'zod';

export const recurringFrequencyEnum = z.enum(['weekly', 'biweekly', 'monthly']);
export const recurringKindEnum = z.enum(['income', 'expense']);

export const recurringTemplateSchema = z.object({
  kind: recurringKindEnum,
  label: z.string().trim().min(2).max(120),
  amount: z.number().min(0),
  frequency: recurringFrequencyEnum,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().optional(),
  source: z.string().trim().max(120).optional().nullable(),
  expense_type: z.enum(['fixed', 'variable', 'debt', 'one_time']).optional(),
  split_method: z.enum(['equal', 'percentage', 'income_based', 'custom']).optional(),
});

export type RecurringTemplateInput = z.infer<typeof recurringTemplateSchema>;
