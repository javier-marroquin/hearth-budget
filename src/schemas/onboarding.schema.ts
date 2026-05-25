import { z } from 'zod';
import { householdSchema } from './household.schema';

export const onboardingSchema = householdSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Mínimo 2 caracteres' })
    .max(80, { message: 'Máximo 80 caracteres' }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
