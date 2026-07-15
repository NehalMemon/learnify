'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { signupSchema, type SignupFormValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthChecklist } from '@/components/auth/PasswordStrengthChecklist';

export function SignupForm() {
  const [serverError, setServerError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const password = watch('password') ?? '';

  const onSubmit = async (values: SignupFormValues) => {
    setServerError('');

    try {
      const response = await authApi.register({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone || undefined,
      });
      window.location.assign(response.redirect || '/dashboard');
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setServerError(message || 'Registration failed. Please try again.');
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
      window.location.assign(response.redirect || '/dashboard');
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setServerError(message || 'Google sign-up failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setServerError('Google sign-up failed. Please try again.');
    setIsGoogleLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Input
          label="Full Name"
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone Number (Optional)"
          type="tel"
          autoComplete="tel"
          placeholder="+1 234 567 8900"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div>
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            placeholder="********"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthChecklist password={password} />
        </div>

        <PasswordInput
          label="Confirm Password"
          autoComplete="new-password"
          placeholder="********"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div>
          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500/20"
              {...register('terms')}
            />
            <label htmlFor="terms" className="block text-sm text-gray-900">
              I agree to the{' '}
              <Link href="/terms" className="font-medium text-purple-600 hover:text-purple-700">
                Terms and Conditions
              </Link>
            </label>
          </div>
          {errors.terms && (
            <p className="mt-1 text-sm text-red-500">{errors.terms.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="min-h-10 w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
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
              <span className="text-sm font-medium text-gray-700">Signing up...</span>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              text="signup_with"
              shape="rectangular"
              size="large"
              theme="outline"
              width="384"
            />
          )}
        </div>
      </div>
    </>
  );
}