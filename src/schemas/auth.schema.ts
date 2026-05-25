import { z } from 'zod';

export const magicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'auth.invalid_email' })
    .email({ message: 'auth.invalid_email' })
    .toLowerCase(),
});

export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
