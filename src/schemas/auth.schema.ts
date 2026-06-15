import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .min(1, { message: 'auth.invalid_email' })
  .email({ message: 'auth.invalid_email' })
  .toLowerCase();

const passwordField = z
  .string()
  .min(8, { message: 'auth.password_too_short' })
  .max(72, { message: 'auth.password_too_long' });

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: 'auth.password_required' }),
});

export const signUpSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, { message: 'auth.password_required' }),
    fullName: z.string().trim().max(120).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.password_mismatch',
    path: ['confirmPassword'],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
