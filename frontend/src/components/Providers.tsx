'use client';

import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ModalProvider } from '@/components/providers/ModalProvider';
import { Toaster } from 'react-hot-toast';

/**
 * Providers
 *
 * Client Component boundary that wraps the application with all React
 * Context providers that cannot run on the server (e.g. GoogleOAuthProvider).
 * AuthProvider and ModalProvider are nested here so their contexts are available app-wide.
 * Toaster is mounted once here so any component can call toast() without
 * needing to render its own Toaster instance.
 *
 * @param children - The React subtree to render inside the provider chain.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <ModalProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '8px',
                background: '#1f2937',
                color: '#f9fafb',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#a855f7', secondary: '#f9fafb' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#f9fafb' },
              },
            }}
          />
        </ModalProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
