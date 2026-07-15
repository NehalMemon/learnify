'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/auth/PasswordInput';

const getSafeRedirect = (value: string | null, fallback = '/dashboard') => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  return value;
};

const getPostLoginRedirect = (role: 'STUDENT' | 'ADMIN', requestedRedirect: string) => {
  if (role === 'ADMIN') {
    return requestedRedirect.startsWith('/admin') ? requestedRedirect : '/admin/dashboard';
  }

  return requestedRedirect.startsWith('/admin') ? '/dashboard' : requestedRedirect;
};

function LoginFormContent() {
  const searchParams = useSearchParams();
  const redirect = getSafeRedirect(searchParams.get('redirect'));

  const [serverError, setServerError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

    try {
      const response = await authApi.login(values);
      window.location.assign(getPostLoginRedirect(response.user.role, redirect));
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setServerError(axiosErr.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsGoogleLoading(true);
    setServerError('');

    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      const response = await authApi.googleLogin(credentialResponse.credential);
      window.location.assign(getPostLoginRedirect(response.user.role, redirect));
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setServerError(axiosErr.response?.data?.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setServerError('Google sign-in failed. Please try again.');
    setIsGoogleLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="********"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500/20"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-purple-600 hover:text-purple-700">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="min-h-10 w-full"
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

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          {isGoogleLoading ? (
            <div className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Signing in...</span>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              text="signin_with"
              shape="rectangular"
              size="large"
              theme="outline"
              width="384"
            />
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Demo Credentials</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-600">
            <p><strong>Admin:</strong> admin@learnify.pk / YourStr0ngPass!</p>
            <p><strong>Student:</strong> student@example.com / Password123!</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}