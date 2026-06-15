import { z } from 'zod';

export const signInBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signUpBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().max(120).optional(),
});

export type SignInBody = z.infer<typeof signInBody>;
export type SignUpBody = z.infer<typeof signUpBody>;
