/**
 * Authentication Utilities
 * 
 * Helper functions for managing authentication state in the frontend.
 */

'use client';

import { getTokens, getUser, clearAuth } from '@/lib/api';

/**
 * Check if user is authenticated (has valid tokens)
 */
export const isAuthenticated = (): boolean => {
  const tokens = getTokens();
  return !!tokens?.accessToken;
};

/**
 * Check if current user is admin
 */
export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.role === 'ADMIN';
};

/**
 * Get current user data
 */
export const getCurrentUser = () => {
  return getUser();
};

/**
 * Get access token (for manual API calls)
 */
export const getAccessToken = (): string | null => {
  const tokens = getTokens();
  return tokens?.accessToken || null;
};

/**
 * Logout user and redirect to login
 */
export const logout = (redirectTo?: string) => {
  clearAuth();
  
  if (typeof window !== 'undefined') {
    const redirectPath = redirectTo || '/login';
    window.location.href = redirectPath;
  }
};

/**
 * Check if user has required role
 */
export const hasRole = (requiredRole: 'STUDENT' | 'ADMIN'): boolean => {
  const user = getUser();
  if (!user) return false;
  
  if (requiredRole === 'ADMIN') {
    return user.role === 'ADMIN';
  }
  
  return user.role === 'STUDENT' || user.role === 'ADMIN';
};

/**
 * Require authentication - redirect to login if not authenticated
 * Use this in client components
 */
export const requireAuth = (redirectTo = '/login'): boolean => {
  if (typeof window === 'undefined') return true;
  
  if (!isAuthenticated()) {
    window.location.href = redirectTo;
    return false;
  }
  
  return true;
};

/**
 * Require admin role - redirect to home if not admin
 * Use this in client components
 */
export const requireAdmin = (redirectTo = '/'): boolean => {
  if (typeof window === 'undefined') return true;
  
  if (!isAuthenticated()) {
    window.location.href = '/login';
    return false;
  }
  
  if (!isAdmin()) {
    window.location.href = redirectTo;
    return false;
  }
  
  return true;
};

/**
 * Get authorization headers for manual fetch calls
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Get authorization headers for file upload
 */
export const getAuthHeadersForUpload = (): HeadersInit => {
  const token = getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
