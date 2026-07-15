import { z } from 'zod';

export const passwordRequirements = [
  {
    key: 'length',
    label: '8+ characters',
    test: (password: string) => password.length >= 8,
  },
  {
    key: 'uppercase',
    label: '1 uppercase letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    key: 'number',
    label: '1 number',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    key: 'special',
    label: '1 special character',
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
] as const;

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must include at least one uppercase letter')
  .regex(/[0-9]/, 'Must include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must include at least one special character');

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    phone: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.boolean().refine((value) => value === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
