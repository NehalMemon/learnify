/**
 * React Hooks for API Client
 *
 * Custom hooks for using the API client in React components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import {
  authApi,
  coursesApi,
  enrollmentsApi,
  quizApi,
  paymentsApi,
  workshopsApi,
  adminApi,
  clearAuth,
} from '@/lib/api';
import type {
  User,
  Course,
  Enrollment,
  QuizAttempt,
  QuizCategory,
  Workshop,
  Payment,
} from '@/types';

// ─── Generic Hook Types ────────────────────────────────────────

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
}

// ─── Auth Hook ─────────────────────────────────────────────────

/**
 * Hook for managing authentication state.
 *
 * The session is validated by /auth/me because JWTs are HttpOnly cookies and
 * intentionally unavailable to client-side JavaScript.
 */
export const useAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // Skip the /auth/me call on public auth pages. The useAuth hook runs
    // globally (via AuthProvider in the root layout), but on /login and
    // /register there is no valid session to check. A stale HttpOnly cookie
    // would trigger a 401 → refresh failure → interceptor redirect → loop.
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/login' || path === '/register' || path.startsWith('/auth-success')) {
        setLoading(false);
        return;
      }
    }

    try {
      const response = await authApi.getMe();
      // getMe returns { success, data: { ...user fields, enrollments } }
      // authApi.getMe returns the unwrapped API response, so extract .data directly.
      setUser(response.data ?? null);
    } catch (err: unknown) {
      const status = (err as AxiosError)?.response?.status;

      // Only a definitive 401 Unauthorized means the token is dead.
      // 403 = lack of permissions (keep the session alive, show restricted UI).
      // Network errors, 5xx, etc. are transient — do NOT evict the user.
      if (status === 401) {
        clearAuth();
      }
      // For all non-401 errors: user stays null but tokens are preserved.
      // The middleware already holds the cookie and will gate protected routes.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.success) {
      setUser(response.user as User);
      router.push('/dashboard');
    }
    return response;
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => {
    const response = await authApi.register(data);
    if (response.success) {
      setUser(response.user as User);
      router.push('/dashboard');
    }
    return response;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      // Hard navigation flushes the Next.js router cache and forces the
      // middleware to re-evaluate the request without stale token cookies.
      window.location.href = '/login';
    }
  };

  const isAuthenticated = !!user;

  return {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshAuth: checkAuth,
  };
};

// ─── Courses Hook ──────────────────────────────────────────────

/**
 * Hook for fetching courses
 */
export const useCourses = (params?: {
  division?: string;
  category?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const [state, setState] = useState<UseApiState<Course[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchCourses = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await coursesApi.listCourses(params);
      setState({
        data: response.data.data.courses,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        data: null,
        loading: false,
        error: 'Failed to fetch courses',
      });
    }
  }, [params]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    ...state,
    refetch: fetchCourses,
  } as UseApiReturn<Course[]>;
};

/**
 * Hook for fetching a single course
 */
export const useCourse = (courseId: string | null) => {
  const [state, setState] = useState<UseApiState<Course>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await coursesApi.getCourse(courseId);
      setState({
        data: response.data.data,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        data: null,
        loading: false,
        error: 'Failed to fetch course',
      });
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return {
    ...state,
    refetch: fetchCourse,
  } as UseApiReturn<Course>;
};

// ─── Enrollments Hook ──────────────────────────────────────────

/**
 * Hook for fetching user enrollments
 */
export const useEnrollments = () => {
  const [state, setState] = useState<UseApiState<Enrollment[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchEnrollments = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await enrollmentsApi.getMyEnrollments();
      setState({
        data: response.data.data,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        data: null,
        loading: false,
        error: 'Failed to fetch enrollments',
      });
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  return {
    ...state,
    refetch: fetchEnrollments,
  } as UseApiReturn<Enrollment[]>;
};

// ─── Quiz Hooks ────────────────────────────────────────────────

/**
 * Hook for fetching quiz categories
 */
export const useQuizCategories = () => {
  const [state, setState] = useState<UseApiState<QuizCategory[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchCategories = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await quizApi.getCategories();
      setState({
        data: response.data.data,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        data: null,
        loading: false,
        error: 'Failed to fetch quiz categories',
      });
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    ...state,
    refetch: fetchCategories,
  } as UseApiReturn<QuizCategory[]>;
};

/**
 * Hook for fetching quiz attempts
 */
export const useQuizAttempts = () => {
  const [state, setState] = useState<UseApiState<QuizAttempt[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchAttempts = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await quizApi.getMyAttempts();
      setState({
        data: response.data.data.attempts,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        data: null,
        loading: false,
        error: 'Failed to fetch quiz attempts',
      });
    }
  }, []);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  return {
    ...state,
    refetch: fetchAttempts,
  } as UseApiReturn<QuizAttempt[]>;
};

// ─── Workshops Hook ────────────────────────────────────────────

/**
 * Hook for fetching workshops
 */
export const useWorkshops = (params?: { divisionId?: string; upcoming?: boolean }) => {
  const [state, setState] = useState<UseApiState<Workshop[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchWorkshops = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await workshopsApi.listWorkshops(params);
      setState({
        data: response.data.data.workshops,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        data: null,
        loading: false,
        error: 'Failed to fetch workshops',
      });
    }
  }, [params]);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  return {
    ...state,
    refetch: fetchWorkshops,
  } as UseApiReturn<Workshop[]>;
};

// ─── Payments Hook ─────────────────────────────────────────────

/**
 * Hook for fetching user payments
 */
export const usePayments = () => {
  const [state, setState] = useState<UseApiState<Payment[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchPayments = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await paymentsApi.getMyPayments();
      setState({
        data: response.data.data,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        data: null,
        loading: false,
        error: 'Failed to fetch payments',
      });
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    ...state,
    refetch: fetchPayments,
  } as UseApiReturn<Payment[]>;
};

// ─── Admin Hook ────────────────────────────────────────────────

/**
 * Hook for admin operations
 */
export const useAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      return response?.data?.message || fallback;
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  };

  const createCourse = async (data: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.createCourse(data);
      return response.data;
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Failed to create course');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCourse = async (id: string, data: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.updateCourse(id, data);
      return response.data;
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Failed to update course');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.deleteCourse(id);
      return response.data;
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Failed to delete course');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
  };
};
