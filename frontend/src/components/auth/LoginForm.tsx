'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { loginWithEmail, signInWithGoogle } from '@/app/actions/authActions';

const labelClassName =
  'ml-1 block text-xs font-medium uppercase tracking-wide text-gray-500';

const inputClassName =
  'mt-1.5 min-h-[46px] w-full rounded-lg border border-transparent bg-[#f3f5f7] px-3.5 py-2.5 text-sm text-[#191c1e] placeholder:text-[#8b8a96] outline-none transition-all duration-200 focus:border-[#3525cd] focus:bg-white focus:ring-4 focus:ring-[#3525cd]/10 disabled:cursor-not-allowed disabled:bg-[#e6e8ea]';

const errorInputClassName = 'border-red-500 focus:border-red-500 focus:ring-red-500/10';
const googleSignInAction = signInWithGoogle as unknown as (formData: FormData) => Promise<void>;

export function LoginForm() {
  const [serverError, setServerError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');

    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);
    formData.append('rememberMe', String(rememberMe));

    let result;
    try {
      result = await loginWithEmail(formData);
    } catch {
      setServerError('Login failed - could not reach the authentication server. Please try again.');
      return;
    }

    if (result?.error) {
      setServerError(result.error);
    }
  };

  return (
    <>
      <form action={googleSignInAction} className="mb-5">
        <Button
          type="submit"
          className="min-h-[46px] w-full rounded-lg border-0 bg-[#4285F4] text-sm font-semibold text-white shadow-md shadow-[#4285F4]/20 transition-all duration-200 hover:bg-[#3367D6] hover:shadow-lg hover:shadow-[#4285F4]/25"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </span>
          Sign in with Google
        </Button>
      </form>

      <div className="relative mb-5 text-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t border-[#d9d7e5]" />
        </div>
        <span className="relative bg-white px-3 text-[11px] font-semibold tracking-[0.14em] text-[#6b6a78]">
          OR SIGN IN WITH EMAIL
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="email" className={labelClassName}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`${inputClassName} ${errors.email ? errorInputClassName : ''}`}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-xs text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className={labelClassName}>
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="********"
            error={errors.password?.message}
            className={`${inputClassName} ${errors.password ? errorInputClassName : ''}`}
            {...register('password')}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-[#c7c4d8] text-[#3525cd] focus:ring-[#3525cd]/20"
            />
            <label htmlFor="remember-me" className="select-none text-xs font-medium text-[#5b5a68]">
              Remember me
            </label>
          </div>

          <Link href="/forgot-password" className="text-xs font-semibold text-[#3525cd] hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="min-h-[48px] w-full rounded-lg bg-[#3525cd] text-sm font-bold text-white shadow-lg shadow-[#3525cd]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2d1db7] hover:shadow-xl hover:shadow-[#3525cd]/25 active:scale-95 disabled:translate-y-0 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-sm text-[#5b5a68]">
          New to Learnify?{' '}
          <Link href="/register" className="font-bold text-[#3525cd] hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <div className="mt-5 rounded-lg bg-[#f7f8fa] px-3 py-2.5 text-xs leading-5 text-[#5b5a68]">
        <p><strong>Admin:</strong> admin@learnify.pk / YourStr0ngPass!</p>
        <p><strong>Student:</strong> student@example.com / Password123!</p>
      </div>
    </>
  );
}
