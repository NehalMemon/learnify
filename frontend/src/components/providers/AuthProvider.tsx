'use client';

/**
 * AuthProvider
 *
 * Provides authentication state and a logout handler to the entire React tree.
 * This is the single source of truth for the user's session on the client.
 * It wraps useAuth() into a React Context so any component can call useAuthContext()
 * without prop-drilling.
 */

import React, { createContext, useContext } from 'react';
import { useAuth } from '@/hooks';
import { getTokens } from '@/lib/api';
import type { User } from '@/types';

// ─── Context Shape ─────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const hasSessionToken = Boolean(getTokens());
  const contextLoading = auth.loading;

  /**
   * Performs a full logout:
   * 1. Calls POST /api/v1/auth/logout so the server clears HttpOnly cookies.
   * 2. Removes client-side cookies via clearAuth() inside authApi.logout().
   * 3. Hard-navigates to /login to flush all Next.js client-side cache and
   *    force the middleware to re-evaluate the request without a token.
   */
  const logout = async (): Promise<void> => {
    await auth.logout();
    // Hard navigation ensures the Next.js router cache is flushed and
    // the middleware re-runs without stale token data in memory.
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
        value={{
          user: auth.user,
          loading: contextLoading,
          isAuthenticated: auth.isAuthenticated,
          logout,
          refreshAuth: auth.refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Consumer Hook ─────────────────────────────────────────────

/**
 * @throws {Error} If used outside of an AuthProvider tree.
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}
