import { z } from 'zod';

export const expenseTypeEnum = z.enum(['fixed', 'variable', 'debt', 'one_time']);
export const paymentStatusEnum = z.enum(['pending', 'paid', 'overdue']);
export const splitMethodEnum = z.enum(['equal', 'percentage', 'income_based', 'custom']);

export const expenseSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .min(0, { message: 'Debe ser >= 0' }),
  currency: z.string().length(3).toUpperCase(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida' }),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida' })
    .nullable()
    .optional(),
  category_id: z.string().uuid().nullable().optional(),
  type: expenseTypeEnum,
  status: paymentStatusEnum.optional(),
  split_method: splitMethodEnum.optional(),
  description: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
