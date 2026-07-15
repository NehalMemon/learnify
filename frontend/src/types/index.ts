/**
 * Learnify Frontend - Shared Types
 * 
 * TypeScript types and interfaces used across the application.
 */

// ─── User & Auth ───────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  hasSeenQuizDisclaimer?: boolean;
  universityProgram?: string | null;
  studyYear?: number;
  learnifyEnabled: boolean;
  doctorsQuizzEnabled: boolean;
  accessExpiresAt?: string | Date | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface QuizOnboardingUpdate {
  hasSeenQuizDisclaimer: boolean;
  universityProgram: string;
  studyYear: number;
}

// ─── Divisions ─────────────────────────────────────────────────

export type DivisionSlug = 'FOUNDATION' | 'MEDED';

export interface Division {
  id: string;
  name: string;
  slug: DivisionSlug;
  _count?: {
    courses: number;
    workshops: number;
  };
}

// ─── Courses ───────────────────────────────────────────────────

export type CourseType =
  | 'FULL_COURSE'
  | 'CRASH_COURSE'
  | 'TEST_SERIES'
  | 'REVISION'
  | 'NOTES_ONLY'
  | 'QUIZ_ACCESS';

export interface Course {
  id: string;
  divisionId: string;
  title: string;
  description?: string | null;
  courseType: CourseType;
  category?: string | null;
  instructor?: string | null;
  price: number;
  meetZoomLink?: string | null;
  nextClassTime?: string | null;
  classroomUrl?: string | null;
  isPublished: boolean;
  division?: Division;
  createdAt: string;
  updatedAt: string;
  _count?: {
    modules: number;
    enrollments: number;
  };
}

export interface CourseWithModules extends Course {
  modules: Module[];
  classSessions?: ClassSession[];
}

// ─── Modules & Materials ───────────────────────────────────────

export interface Module {
  id: string;
  courseId: string;
  title: string;
  sequence: number;
  requiredModuleId?: string | null;
  requiredModule?: Module | null;
  materials?: Material[];
  _count?: {
    materials: number;
  };
}

export type MaterialType = 'NOTE' | 'VIDEO' | 'QUIZ';

export interface Material {
  id: string;
  moduleId: string;
  title: string;
  materialType: MaterialType;
  objectUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  secureViewOnly: boolean;
  sequence: number;
  createdAt: string;
}

export interface MaterialWithProgress extends Material {
  progress?: {
    isCompleted: boolean;
    completedAt?: string | null;
  };
}

export interface ModuleWithProgress extends Module {
  progress?: {
    isUnlocked: boolean;
    isCompleted: boolean;
    completedAt?: string | null;
  };
  materials: MaterialWithProgress[];
}

// ─── Enrollments ───────────────────────────────────────────────

export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progressPercent: number;
  enrolledAt: string;
  updatedAt: string;
  course?: Course;
  user?: User;
  payments?: Payment[];
  materialProgress?: MaterialProgress[];
  moduleProgress?: ModuleProgress[];
}

export interface EnrollmentWithProgress extends Enrollment {
  course: CourseWithModules;
  materialProgress: MaterialProgress[];
  moduleProgress: ModuleProgress[];
}

// ─── Progress Tracking ─────────────────────────────────────────

export interface MaterialProgress {
  id: string;
  enrollmentId: string;
  materialId: string;
  isCompleted: boolean;
  completedAt?: string | null;
  material?: Material;
}

export interface ModuleProgress {
  id: string;
  enrollmentId: string;
  moduleId: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  module?: Module;
}

// ─── Payments ──────────────────────────────────────────────────

export type PaymentType = 'LUMP_SUM' | 'MONTHLY';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'OVERDUE';

export interface Payment {
  id: string;
  enrollmentId: string;
  paymentType: PaymentType;
  amount: number;
  status: PaymentStatus;
  dueDate?: string | null;
  proofImageUrl?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  enrollment?: Enrollment;
}

// ─── Quiz (DoctorsQuizz) ───────────────────────────────────────

export interface Quiz {
  id: string;
  subject?: string;
  title: string;
  category?: string;
  duration?: string | number;
}

export interface QuizCategory {
  id: string;
  name: string;
  _count?: {
    questions: number;
  };
}

export interface QuizQuestion {
  id: string;
  categoryId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation?: string | null;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  categoryId: string;
  score: number;
  totalQs: number;
  timeTakenSec?: number | null;
  startedAt: string;
  finishedAt?: string | null;
  user?: User;
  category?: QuizCategory;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selected: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  question?: QuizQuestion;
}

export interface QuizAttemptWithDetails extends QuizAttempt {
  category: QuizCategory;
  answers: (QuizAnswer & {
    question: QuizQuestion;
  })[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  score: number;
  totalQs: number;
  percentage: number;
  timeTakenSec?: number | null;
  finishedAt: string;
}

// ─── Workshops ─────────────────────────────────────────────────

export interface Workshop {
  id: string;
  divisionId: string;
  title: string;
  instructor?: string | null;
  description?: string | null;
  date: string;
  platform?: string | null;
  meetingLink?: string | null;
  price: number;
  recordingUrl?: string | null;
  createdAt: string;
  division?: Division;
  _count?: {
    registrations: number;
  };
}

export interface WorkshopRegistration {
  id: string;
  userId: string;
  workshopId: string;
  registeredAt: string;
  user?: User;
  workshop?: Workshop;
}

// ─── Class Sessions ────────────────────────────────────────────

export interface ClassSession {
  id: string;
  courseId: string;
  title?: string | null;
  scheduledAt: string;
  meetingLink: string;
  platform?: string | null;
  createdAt: string;
  course?: Course;
}

// ─── Grade Sheets ──────────────────────────────────────────────

export interface GradeSheet {
  id: string;
  enrollmentId: string;
  title: string;
  s3Url: string;
  uploadedAt: string;
  enrollment?: Enrollment;
}

// ─── System Audit Logs ─────────────────────────────────────────

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface SystemLog {
  id: string;
  level: LogLevel;
  action: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  userId?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

// ─── API Responses ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: ValidationError[];
}

// ─── Form Data ─────────────────────────────────────────────────

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface CreateCourseForm {
  divisionId: string;
  title: string;
  description?: string;
  courseType: CourseType;
  category?: string;
  instructor?: string;
  price?: number;
  meetZoomLink?: string;
  nextClassTime?: string;
  classroomUrl?: string;
  isPublished?: boolean;
}

export interface CreateModuleForm {
  title: string;
  sequence: number;
  requiredModuleId?: string;
}

export interface CreateMaterialForm {
  title: string;
  materialType: MaterialType;
  secureViewOnly?: boolean;
  sequence?: number;
  durationSec?: number;
  thumbnailUrl?: string;
}

// ─── Real-Time Events (Pusher) ─────────────────────────────────

export interface QuizStartedEvent {
  startTime: string; // ISO 8601 date
  durationSec: number;
}

export type LeaderboardUpdatedEvent = Record<string, never>;
