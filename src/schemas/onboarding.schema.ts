import { z } from 'zod';
import { householdSchema } from './household.schema';

export const onboardingSchema = householdSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'At least 2 characters' })
    .max(80, { message: 'Maximum 80 characters' }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
