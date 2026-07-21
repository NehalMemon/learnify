'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { signupSchema, type SignupFormValues } from '@/lib/validations/auth';
import { signUpWithEmail, signInWithGoogle } from '@/app/actions/authActions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthChecklist } from '@/components/auth/PasswordStrengthChecklist';

export function SignupForm() {
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false); // tracks focus state of password input

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
      password: '',
      terms: false,
    },
  });

  const password = watch('password') ?? '';

  const onSubmit = async (values: SignupFormValues) => {
    setServerError('');

    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);
    formData.append('fullName', values.fullName);
    if (values.phone) {
      formData.append('phone', values.phone);
    }

    const result = await signUpWithEmail(formData);
    
    if (result?.error) {
      setServerError(result.error);
    } else if (result?.success) {
      setSuccessMessage(result.message || 'Check your email to continue.');
    }
  };



  return (
    <>
      {successMessage ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-8 text-center sm:px-6">
          <h3 className="mb-2 text-lg font-medium text-green-800">Registration Successful!</h3>
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
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



        <div>
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            placeholder="********"
            error={errors.password?.message}
            {...register('password')}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
          />
          {/* Password requirements reveal */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isPasswordFocused || password.length > 0 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <PasswordStrengthChecklist password={password} />
          </div>
        </div>



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
          <form action={signInWithGoogle} className="w-full max-w-sm">
            <Button type="submit" variant="outline" className="w-full h-11 bg-white hover:bg-gray-50 text-gray-700 border-gray-300">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </Button>
          </form>
        </div>
      </div>
        </>
      )}
    </>
  );
}