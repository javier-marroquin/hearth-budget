import { z } from 'zod';

export const incomeSchema = z.object({
  user_id: z.string().uuid({ message: 'Selecciona un miembro' }),
  amount: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .min(0, { message: 'Debe ser mayor o igual a 0' }),
  currency: z.string().length(3).toUpperCase(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida (YYYY-MM-DD)' }),
  category_id: z.string().uuid().nullable().optional(),
  source: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type IncomeInput = z.infer<typeof incomeSchema>;
