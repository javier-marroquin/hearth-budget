import { z } from 'zod';

export const recurringFrequencyEnum = z.enum(['weekly', 'biweekly', 'monthly']);
export const recurringKindEnum = z.enum(['income', 'expense']);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date (YYYY-MM-DD)' });

export const recurringTemplateSchema = z
  .object({
    kind: recurringKindEnum,
    label: z.string().trim().min(2).max(120),
    amount: z.number().min(0),
    frequency: recurringFrequencyEnum,
    start_date: isoDate,
    end_date: z.union([z.literal(''), isoDate]).optional().nullable(),
    category_id: z.string().uuid().nullable().optional(),
    user_id: z.string().uuid().optional(),
    source: z.string().trim().max(120).optional().nullable(),
    expense_type: z.enum(['fixed', 'variable', 'debt', 'one_time']).optional(),
    split_method: z.enum(['equal', 'percentage', 'income_based', 'custom']).optional(),
  })
  .refine(
    (data) => {
      const end = data.end_date?.trim();
      if (!end) return true;
      return end >= data.start_date;
    },
    { message: 'La fecha de fin debe ser igual o posterior al inicio', path: ['end_date'] },
  );

export type RecurringTemplateInput = z.infer<typeof recurringTemplateSchema>;
