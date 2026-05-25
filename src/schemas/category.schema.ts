import { z } from 'zod';

export const categoryTypeEnum = z.enum(['income', 'expense', 'savings']);

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: categoryTypeEnum,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'Color #RRGGBB' }),
  icon: z.string().trim().min(1).max(40),
  monthly_budget: z.number().nullable().optional(),
  rollover_enabled: z.boolean().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
