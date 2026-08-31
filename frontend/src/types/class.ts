export type ClassStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ClassCategory = 
  | 'Foundation Medical'
  | 'Clinical Practice'
  | 'Pharmacology'
  | 'Surgical Skills'
  | 'General Education';

export interface ClassLesson {
  id: string;
  title: string;
  durationMinutes: number;
  type: 'video' | 'article' | 'quiz';
  isPreviewAllowed: boolean;
}

export interface ClassModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: ClassLesson[];
}

export interface ClassItem {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  instructorAvatar?: string;
  category: ClassCategory;
  thumbnailUrl?: string;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
  modulesCount: number;
  studentsEnrolled: number;
  priceAmount?: number;
  isFree: boolean;
  enrollmentLimit?: number;
  prerequisites: string[];
}

export interface ClassFilters {
  searchQuery: string;
  statusFilter: 'ALL' | ClassStatus;
}

export interface ClassDetailsFormData {
  title: string;
  description: string;
  category: ClassCategory;
  thumbnailUrl?: string;
}

export interface ClassSettingsFormData {
  enrollmentLimit: number | null;
  isFree: boolean;
  priceAmount: number;
  prerequisites: string[];
}
