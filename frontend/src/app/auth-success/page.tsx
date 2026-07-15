import { Suspense } from 'react';

import AuthSuccessClient from './AuthSuccessClient';

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0d1321]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3e5c76] mx-auto" />
            <p className="mt-4 text-sm text-[#6b8cac]">Completing authentication…</p>
          </div>
        </div>
      }
    >
      <AuthSuccessClient />
    </Suspense>
  );
}
