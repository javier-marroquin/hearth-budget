import { z } from 'zod';

export const householdSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'At least 2 characters' })
    .max(80, { message: 'Maximum 80 characters' }),
  currency: z.string().trim().length(3, { message: '3-letter code (e.g. COP, USD)' }).toUpperCase(),
  timezone: z.string().trim().min(1),
});

export type HouseholdInput = z.infer<typeof householdSchema>;
