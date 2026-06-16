import { z } from 'zod';

export const contributionStatusEnum = z.enum(['pending', 'received', 'overdue']);

export const contributionSchema = z.object({
  user_id: z.string().uuid({ message: 'Selecciona un miembro' }),
  amount: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, { message: 'Debe ser >= 0' }),
  currency: z.string().length(3).toUpperCase(),
  expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date' }),
  received_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date' })
    .nullable()
    .optional(),
  status: contributionStatusEnum.optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ContributionInput = z.infer<typeof contributionSchema>;
