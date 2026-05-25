import { z } from 'zod';

export const householdSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Mínimo 2 caracteres' })
    .max(80, { message: 'Máximo 80 caracteres' }),
  currency: z.string().trim().length(3, { message: 'Código de 3 letras (ej. COP, USD)' }).toUpperCase(),
  timezone: z.string().trim().min(1),
});

export type HouseholdInput = z.infer<typeof householdSchema>;
