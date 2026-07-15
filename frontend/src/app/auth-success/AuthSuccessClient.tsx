'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const getSafeRedirect = (value: string | null, fallback = '/dashboard') => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  return value;
};

export default function AuthSuccessClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectTo = getSafeRedirect(searchParams.get('redirect'));
    window.history.replaceState(null, '', '/auth-success');
    window.location.replace(redirectTo);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1321]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3e5c76] mx-auto" />
        <p className="mt-4 text-sm text-[#6b8cac]">Completing authentication...</p>
      </div>
    </div>
  );
}