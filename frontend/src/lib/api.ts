/**
 * Learnify API Client
 * 
 * Axios instance with automatic JWT token refresh interceptors.
 * Handles token refresh locking to prevent multiple simultaneous refresh calls.
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import Cookies from 'js-cookie';
import type { QuizQuestion, User } from '@/types';

// ─── Types ─────────────────────────────────────────────────────

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  redirect?: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
}

type QueryParams = Record<string, string | number | boolean | undefined>;
type Payload = Record<string, unknown>;
type QuizQuestionPayload = Record<string, unknown>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const STORAGE_KEYS = {
  USER: 'user',
} as const;

const LEGACY_TOKEN_COOKIE_NAMES = ['accessToken', 'refreshToken', 'token'] as const;

// Auth Storage Helpers

/**
 * Auth tokens are stored in HttpOnly cookies set by the API server.
 * Client-side JavaScript cannot read them by design.
 */
export const getTokens = (): null => null;

/**
 * Kept as a no-op for older imports; token writes must happen server-side.
 */
export const saveTokens = (): void => {};

/**
 * Removes local auth metadata and any legacy JS-readable token cookies.
 */
export const clearAuth = (): void => {
  if (typeof window === 'undefined') return;

  LEGACY_TOKEN_COOKIE_NAMES.forEach((name) => Cookies.remove(name, { path: '/' }));
  localStorage.removeItem(STORAGE_KEYS.USER);
};

/**
 * Retrieves user data from localStorage.
 */
export const getUser = (): Partial<User> | null => {
  if (typeof window === 'undefined') return null;

  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};
// Refresh Token Lock ────────────────────────────────────────

/**
 * Queue for requests waiting for token refresh to complete
 */
let refreshQueue: Array<() => void> = [];

/**
 * Flag to prevent multiple simultaneous refresh calls
 */
let isRefreshing = false;

/**
 * Adds a callback to the refresh queue
 */
const subscribeTokenRefresh = (cb: () => void): void => {
  refreshQueue.push(cb);
};

/**
 * Executes all callbacks in the refresh queue with the new token
 */
const onTokenRefreshed = (): void => {
  refreshQueue.forEach((cb) => cb());
  refreshQueue = [];
};

/**
 * Clears the refresh queue (used on refresh failure)
 */
const onRefreshFailed = (): void => {
  refreshQueue = [];
};

// ─── Axios Instance ────────────────────────────────────────────

/**
 * Create Axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// ─── CSRF Protection ───────────────────────────────────────────

/**
 * In-memory cache for CSRF token
 */
let cachedCsrfToken: string | null = null;

/**
 * Fetches a new CSRF token from the backend
 */
export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    // We use a clean axios instance to avoid interceptor recursion
    const response = await axios.get<{ success: boolean; csrfToken: string }>(
      `${API_URL}/csrf-token`,
      { withCredentials: true }
    );
    cachedCsrfToken = response.data.csrfToken;
    return cachedCsrfToken;
  } catch (error) {
    // Zero-Trust: Log failure but don't crash the client
    // The subsequent request will fail with 403 if the token is missing.
    return null;
  }
};

// ─── Request Interceptor ───────────────────────────────────────

/**
 * Attach CSRF token to state-changing requests. Auth is cookie-backed.
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 1. CSRF Protection for state-changing methods
    const method = config.method?.toLowerCase();
    const isStateChanging = method && ['post', 'put', 'patch', 'delete'].includes(method);

    if (isStateChanging) {
      // If we don't have a token, fetch one first
      if (!cachedCsrfToken) {
        await fetchCsrfToken();
      }
      
      if (cachedCsrfToken) {
        config.headers['x-csrf-token'] = cachedCsrfToken;
      }
    }


    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ──────────────────────────────────────

/**
 * Handle 401 responses with automatic token refresh
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const requestUrl = originalRequest?.url ?? '';
    const isAuthAttempt =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/google') ||
      requestUrl.includes('/auth/refresh');

    if (error.response?.status !== 401 || originalRequest._retry || isAuthAttempt) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh(() => {
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      if (!cachedCsrfToken) {
        await fetchCsrfToken();
      }

      await axios.post<RefreshResponse>(
        `${API_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            ...(cachedCsrfToken ? { 'x-csrf-token': cachedCsrfToken } : {}),
          },
        }
      );

      onTokenRefreshed();
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuth();
      onRefreshFailed();

      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        // Avoid redirect loop: don't redirect to /login if already on a public auth page.
        // The stale HttpOnly cookie triggers 401 → refresh fail → redirect here,
        // but reloading /login just restarts the cycle.
        const isOnAuthPage =
          currentPath === '/login' ||
          currentPath === '/register' ||
          currentPath.startsWith('/auth-success');
        if (!isOnAuthPage) {
          window.location.href = '/login';
        }
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
// API Methods ───────────────────────────────────────────────

/**
 * Auth API methods
 */
export const authApi = {
  /**
   * Register a new user.
   */
  register: async (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    if (response.data.success) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Login user.
   */
  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    if (response.data.success) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Logout user and clear local auth metadata.
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearAuth();
    }
  },

  /**
   * Get current user profile.
   */
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateQuizOnboarding: async (data: {
    hasSeenQuizDisclaimer: boolean;
    universityProgram: string;
    studyYear: number;
  }) => {
    const response = await apiClient.patch('/users/quiz-onboarding', data);
    return response.data;
  },

  /**
   * Google OAuth login.
   */
  googleLogin: async (tokenId: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/google', { tokenId });
    if (response.data.success) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
    }
    return response.data;
  },
};
/**
 * Courses API methods
 */
export const coursesApi = {
  /**
   * List all published courses
   */
  listCourses: (params?: {
    division?: string;
    category?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    return apiClient.get('/courses', { params });
  },

  /**
   * Get course details
   */
  getCourse: (id: string) => {
    return apiClient.get(`/courses/${id}`);
  },

  /**
   * Get course modules (requires enrollment)
   */
  getCourseModules: (id: string) => {
    return apiClient.get(`/courses/${id}/modules`);
  },

  /**
   * Get full course content tree with progress
   */
  getCourseContent: (courseId: string) => {
    return apiClient.get(`/courses/${courseId}/content`);
  },

  /**
   * Get live class link
   */
  getLiveClass: (id: string) => {
    return apiClient.get(`/courses/${id}/live-class`);
  },

  /**
   * Get classroom URL
   */
  getClassroom: (id: string) => {
    return apiClient.get(`/courses/${id}/classroom`);
  },
};

/**
 * Enrollments API methods
 */
export const enrollmentsApi = {
  /**
   * Get current user's enrollments
   */
  getMyEnrollments: () => {
    return apiClient.get('/enrollments/my');
  },

  /**
   * Get enrollment details
   */
  getEnrollment: (id: string) => {
    return apiClient.get(`/enrollments/${id}`);
  },

  /**
   * Enroll in a course
   */
  createEnrollment: (data: { courseId: string; userId?: string }) => {
    return apiClient.post('/enrollments', data);
  },
};

/**
 * Progress API methods
 */
export const progressApi = {
  /**
   * Mark a material as completed
   */
  completeMaterial: (materialId: string) => {
    return apiClient.post(`/progress/material/${materialId}/complete`);
  },
};

/**
 * Quiz API methods
 */
export const quizApi = {
  /**
   * List all published named exams (Exam Arena catalogue).
   */
  listQuizzes: (params?: { page?: number; limit?: number; search?: string; categoryId?: string }) => {
    return apiClient.get('/quiz/quizzes', { params });
  },

  /**
   * Fetch a single quiz's lobby details (title, question count, duration).
   * Uses the catalogue endpoint and filters client-side — the backend does not
   * expose a dedicated GET /quizzes/:id yet, so we reuse the list response.
   */
  getQuiz: (quizId: string) => {
    return apiClient.get(`/quiz/quizzes`, { params: { id: quizId } });
  },

  /**
   * List quiz categories
   */
  getCategories: () => {
    return apiClient.get('/quiz/categories');
  },

  /**
   * Get leaderboard
   */
  getLeaderboard: (params?: { categoryId?: string; limit?: number }) => {
    return apiClient.get('/quiz/leaderboard', { params });
  },

  /**
   * Start an Exam Arena attempt for a named quiz.
   * Returns { attemptId, durationSec, questions[] }.
   */
  startQuizArena: (quizId: string) => {
    return apiClient.post(`/quiz/quizzes/${quizId}/start`);
  },

  /**
   * Legacy: Start a random-category quiz attempt
   */
  startQuiz: (data: { categoryId: string; count?: number }) => {
    return apiClient.post('/quiz/start', data);
  },

  /**
   * Submit quiz answers (legacy bulk endpoint)
   */
  submitQuiz: (attemptId: string, data: {
    answers: Array<{ questionId: string; selected: string }>;
    timeTakenSec?: number;
  }) => {
    return apiClient.post(`/quiz/attempts/${attemptId}/submit`, data);
  },

  /**
   * Get user's quiz attempts
   */
  getMyAttempts: () => {
    return apiClient.get('/quiz/attempts/my');
  },

  /**
   * Get attempt details
   */
  getAttempt: (attemptId: string) => {
    return apiClient.get(`/quiz/attempts/${attemptId}`);
  },

  /**
   * Submit a single answer to the Redis-backed real-time engine.
   * Fire-and-forget — callers must NOT await this on the critical path.
   */
  submitAnswer: (attemptId: string, data: {
    questionId: string;
    selected: string;
  }) => {
    return apiClient.post(`/quiz/attempts/${attemptId}/answer`, data);
  },

  /**
   * Finalize quiz (enqueues BullMQ worker to flush Redis → PostgreSQL)
   */
  finalizeQuiz: (attemptId: string, data?: { timeTakenSec?: number }) => {
    return apiClient.post(`/quiz/attempts/${attemptId}/finalize`, data);
  },
};

/**
 * Payments API methods
 */
export const paymentsApi = {
  /**
   * Get current user's payments
   */
  getMyPayments: () => {
    return apiClient.get('/payments/my');
  },

  /**
   * Submit payment proof
   */
  submitProof: (paymentId: string, data: { proofImageUrl: string }) => {
    return apiClient.patch(`/payments/${paymentId}/submit-proof`, data);
  },
};

/**
 * Workshops API methods
 */
export const workshopsApi = {
  /**
   * List all workshops
   */
  listWorkshops: (params?: { divisionId?: string; upcoming?: boolean }) => {
    return apiClient.get('/workshops', { params });
  },

  /**
   * Get workshop details
   */
  getWorkshop: (id: string) => {
    return apiClient.get(`/workshops/${id}`);
  },

  /**
   * Get user's registered workshops
   */
  getMyWorkshops: () => {
    return apiClient.get('/workshops/my');
  },

  /**
   * Register for a workshop
   */
  register: (workshopId: string) => {
    return apiClient.post(`/workshops/${workshopId}/register`);
  },

  /**
   * Cancel workshop registration
   */
  cancelRegistration: (workshopId: string) => {
    return apiClient.delete(`/workshops/${workshopId}/register`);
  },
};

/**
 * Divisions API methods
 */
export const divisionsApi = {
  /**
   * List all divisions
   */
  listDivisions: () => {
    return apiClient.get('/divisions');
  },

  /**
   * Get courses for a division
   */
  getDivisionCourses: (slug: string, params?: { category?: string }) => {
    return apiClient.get(`/divisions/${slug}/courses`, { params });
  },
};

/**
 * Admin API methods
 */
export const adminApi = {
  // Courses
  listCourses: (params?: QueryParams) => {
    return apiClient.get('/admin/courses', { params });
  },
  createCourse: (data: Payload) => {
    return apiClient.post('/admin/courses', data);
  },
  updateCourse: (id: string, data: Payload) => {
    return apiClient.put(`/admin/courses/${id}`, data);
  },
  deleteCourse: (id: string) => {
    return apiClient.delete(`/admin/courses/${id}`);
  },

  // Modules
  listModules: (courseId: string) => {
    return apiClient.get(`/admin/courses/${courseId}/modules`);
  },
  createModule: (courseId: string, data: Payload) => {
    return apiClient.post(`/admin/courses/${courseId}/modules`, data);
  },
  updateModule: (id: string, data: Payload) => {
    return apiClient.put(`/admin/modules/${id}`, data);
  },
  deleteModule: (id: string) => {
    return apiClient.delete(`/admin/modules/${id}`);
  },

  // Materials (with file upload support)
  createMaterial: (moduleId: string, formData: FormData) => {
    return apiClient.post(`/admin/modules/${moduleId}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateMaterial: (id: string, formData: FormData) => {
    return apiClient.put(`/admin/materials/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteMaterial: (id: string) => {
    return apiClient.delete(`/admin/materials/${id}`);
  },

  // Enrollments
  listEnrollments: (params?: QueryParams) => {
    return apiClient.get('/admin/enrollments', { params });
  },
  updateEnrollmentStatus: (id: string, data: { status: string }) => {
    return apiClient.patch(`/admin/enrollments/${id}/status`, data);
  },

  // Payments
  listPayments: (params?: QueryParams) => {
    return apiClient.get('/admin/payments', { params });
  },
  verifyPayment: (id: string) => {
    return apiClient.put(`/admin/payments/${id}/verify`);
  },

  // Users
  listUsers: (params?: QueryParams) => {
    return apiClient.get('/admin/users', {
      params: {
        ...params,
        timestamp: Date.now(),
      },
    });
  },
  getStats: () => {
    return apiClient.get('/admin/stats');
  },
  getSystemActivity: () => {
    return apiClient.get('/admin/dashboard/activity');
  },
  getSystemLogs: (params?: { page?: number; limit?: number; level?: string; action?: string }) => {
    return apiClient.get('/admin/logs', { params });
  },

  createUser: (data: { email: string; password: string; fullName: string; role: string }) => {
    return apiClient.post('/admin/users', data);
  },
  updateUserRole: (id: string, data: { role: string }) => {
    return apiClient.patch(`/admin/users/${id}/role`, data);
  },
  updateUserAccess: (id: string, data: { learnifyEnabled: boolean; doctorsQuizzEnabled: boolean }) => {
    return apiClient.patch(`/admin/users/${id}/access`, data);
  },
  updateUserStatus: (id: string, data: { status: 'ACTIVE' | 'DEACTIVATED' }) => {
    return apiClient.patch(`/admin/users/${id}/status`, data);
  },
  resetUserPassword: (id: string) => {
    return apiClient.patch(`/admin/users/${id}/reset-password`);
  },
  deleteUser: (id: string) => {
    return apiClient.delete(`/admin/users/${id}`);
  },

  // Quiz
  listQuizzes: (params?: QueryParams) => {
    return apiClient.get('/admin/quizzes', { params });
  },
  toggleQuizStatus: (id: string, data: { isPublished: boolean }) => {
    return apiClient.patch(`/admin/quizzes/${id}/status`, data);
  },
  deleteQuiz: (id: string) => {
    return apiClient.delete(`/admin/quizzes/${id}`);
  },
  createQuizCategory: (data: { name: string }) => {
    return apiClient.post('/admin/quiz/categories', data);
  },
  updateQuizCategory: (id: string, data: { name: string }) => {
    return apiClient.put(`/admin/quiz/categories/${id}`, data);
  },
  deleteQuizCategory: (id: string) => {
    return apiClient.delete(`/admin/quiz/categories/${id}`);
  },
  addQuizQuestion: (categoryId: string, data: QuizQuestionPayload) => {
    return apiClient.post(`/admin/quiz/categories/${categoryId}/questions`, data);
  },
  bulkAddQuestions: (categoryId: string, data: { questions: QuizQuestionPayload[] }) => {
    return apiClient.post(`/admin/quiz/categories/${categoryId}/questions/bulk`, data);
  },
  updateQuizQuestion: (id: string, data: QuizQuestionPayload) => {
    return apiClient.put(`/admin/quiz/questions/${id}`, data);
  },
  deleteQuizQuestion: (id: string) => {
    return apiClient.delete(`/admin/quiz/questions/${id}`);
  },
  extractMCQs: (formData: FormData) => {
    return apiClient.post('/admin/quizzes/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  bulkCreateQuestionsToQuiz: (data: { quizId: string; questions: QuizQuestion[] }) => {
    return apiClient.post('/admin/quizzes/bulk-create', data);
  },

  // Classes
  createClass: (data: Payload) => {
    return apiClient.post('/admin/classes', data);
  },
  updateClass: (id: string, data: Payload) => {
    return apiClient.put(`/admin/classes/${id}`, data);
  },

  // Grade Sheets
  uploadGradeSheet: (enrollmentId: string, formData: FormData) => {
    return apiClient.post(`/admin/enrollments/${enrollmentId}/grades`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Exports ───────────────────────────────────────────────────

export default apiClient;
export { apiClient };
