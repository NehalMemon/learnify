'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';

// ── Zod Schema ─────────────────────────────────────────────────────────────
// All string fields are trimmed so whitespace-only values fail validation
// before they ever reach the API.

const COURSE_TYPES = [
  'FULL_COURSE',
  'CRASH_COURSE',
  'TEST_SERIES',
  'REVISION',
  'NOTES_ONLY',
  'QUIZ_ACCESS',
] as const;

const courseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(200, 'Title must be at most 200 characters.'),

  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters.')
    .max(2000, 'Description must be at most 2000 characters.'),

  courseType: z.enum(COURSE_TYPES, {
    errorMap: () => ({ message: 'Please select a valid course type.' }),
  }),

  category: z.string().trim().max(100).optional().or(z.literal('')),

  instructor: z
    .string()
    .trim()
    .min(2, 'Instructor name must be at least 2 characters.')
    .max(150, 'Instructor name must be at most 150 characters.'),

  price: z
    .number({ invalid_type_error: 'Price must be a number.' })
    .min(0, 'Price cannot be negative.')
    .max(999999, 'Price value is too large.'),

  divisionId: z.string().uuid('Please select a valid division.'),

  classroomUrl: z
    .string()
    .url('Classroom URL must be a valid URL.')
    .optional()
    .or(z.literal('')),

  isPublished: z.boolean(),
});

export type CourseFormValues = z.infer<typeof courseSchema>;

// ── Props ──────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  name: string;
}

interface CourseFormProps {
  /** Populated course data triggers "edit" mode; undefined = create mode. */
  initialData?: Partial<CourseFormValues> & { id?: string };
  /** Available divisions fetched by the parent page. */
  divisions: Division[];
  /** Called after a successful create or update so the parent can refresh. */
  onSuccess: () => void;
  /** Called when the admin closes the modal/panel without saving. */
  onClose: () => void;
}

// ── Shared Tailwind class helpers ──────────────────────────────────────────

const inputBase =
  'w-full px-3 py-2 bg-white border rounded-lg text-gray-900 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 ' +
  'disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors';

const inputError = 'border-red-400 focus:border-red-400 focus:ring-red-500/20';
const inputOk = 'border-gray-300';

// ── Component ──────────────────────────────────────────────────────────────

/**
 * CourseForm
 *
 * Reusable form for creating and updating a course.
 * Delegates all API calls to `adminApi` so HttpOnly cookies are forwarded
 * automatically by the configured Axios instance (withCredentials: true).
 *
 * @param initialData - Pre-populate fields when editing an existing course.
 * @param divisions   - Division options for the select field.
 * @param onSuccess   - Parent callback triggered after a successful save.
 * @param onClose     - Parent callback triggered when the form should close.
 */
export function CourseForm({ initialData, divisions, onSuccess, onClose }: CourseFormProps) {
  const isEditing = Boolean(initialData?.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      courseType: 'FULL_COURSE',
      category: '',
      instructor: '',
      price: 0,
      divisionId: '',
      classroomUrl: '',
      isPublished: false,
    },
  });

  // Sync form state whenever the parent changes which course to edit.
  useEffect(() => {
    reset({
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      courseType: initialData?.courseType ?? 'FULL_COURSE',
      category: initialData?.category ?? '',
      instructor: initialData?.instructor ?? '',
      price: initialData?.price ?? 0,
      divisionId: initialData?.divisionId ?? '',
      classroomUrl: initialData?.classroomUrl ?? '',
      isPublished: initialData?.isPublished ?? false,
    });
  }, [initialData, reset]);

  // ── Submit handler ───────────────────────────────────────────────────────

  const onSubmit = async (data: CourseFormValues) => {
    try {
      if (isEditing && initialData?.id) {
        await adminApi.updateCourse(initialData.id, data as Record<string, unknown>);
        toast.success('Course updated successfully.');
      } else {
        await adminApi.createCourse(data as Record<string, unknown>);
        toast.success('Course created successfully.');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Something went wrong. Please try again.');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

      {/* Title */}
      <div>
        <label htmlFor="cf-title" className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="cf-title"
          type="text"
          placeholder="e.g. MDCAT Biology Crash Course"
          {...register('title')}
          className={`${inputBase} ${errors.title ? inputError : inputOk}`}
          aria-describedby={errors.title ? 'cf-title-err' : undefined}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && (
          <p id="cf-title-err" role="alert" className="mt-1 text-xs text-red-600">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="cf-desc" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="cf-desc"
          rows={4}
          placeholder="Provide a detailed course overview…"
          {...register('description')}
          className={`${inputBase} resize-none ${errors.description ? inputError : inputOk}`}
          aria-describedby={errors.description ? 'cf-desc-err' : undefined}
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description && (
          <p id="cf-desc-err" role="alert" className="mt-1 text-xs text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Course Type + Division */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-type" className="block text-sm font-medium text-gray-700 mb-1">
            Course Type <span className="text-red-500">*</span>
          </label>
          <select
            id="cf-type"
            {...register('courseType')}
            className={`${inputBase} ${errors.courseType ? inputError : inputOk}`}
            aria-invalid={Boolean(errors.courseType)}
          >
            {COURSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          {errors.courseType && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.courseType.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cf-division" className="block text-sm font-medium text-gray-700 mb-1">
            Division <span className="text-red-500">*</span>
          </label>
          <select
            id="cf-division"
            {...register('divisionId')}
            className={`${inputBase} ${errors.divisionId ? inputError : inputOk}`}
            aria-invalid={Boolean(errors.divisionId)}
          >
            <option value="">— Select division —</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.divisionId && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.divisionId.message}
            </p>
          )}
        </div>
      </div>

      {/* Instructor + Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-instructor" className="block text-sm font-medium text-gray-700 mb-1">
            Instructor <span className="text-red-500">*</span>
          </label>
          <input
            id="cf-instructor"
            type="text"
            placeholder="e.g. Dr. Ahsan Khan"
            {...register('instructor')}
            className={`${inputBase} ${errors.instructor ? inputError : inputOk}`}
            aria-invalid={Boolean(errors.instructor)}
          />
          {errors.instructor && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.instructor.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cf-category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <input
            id="cf-category"
            type="text"
            placeholder="e.g. Biology, Chemistry"
            {...register('category')}
            className={`${inputBase} ${errors.category ? inputError : inputOk}`}
          />
          {errors.category && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      {/* Price + Classroom URL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-price" className="block text-sm font-medium text-gray-700 mb-1">
            Price (PKR) <span className="text-red-500">*</span>
          </label>
          <input
            id="cf-price"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            {...register('price', { valueAsNumber: true })}
            className={`${inputBase} ${errors.price ? inputError : inputOk}`}
            aria-invalid={Boolean(errors.price)}
          />
          {errors.price && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.price.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cf-classroom" className="block text-sm font-medium text-gray-700 mb-1">
            Classroom URL
          </label>
          <input
            id="cf-classroom"
            type="url"
            placeholder="https://classroom.google.com/…"
            {...register('classroomUrl')}
            className={`${inputBase} ${errors.classroomUrl ? inputError : inputOk}`}
          />
          {errors.classroomUrl && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.classroomUrl.message}
            </p>
          )}
        </div>
      </div>

      {/* Published toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <input
          id="cf-published"
          type="checkbox"
          {...register('isPublished')}
          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
        <label htmlFor="cf-published" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
          Publish immediately
          <span className="ml-1 text-xs text-gray-400 font-normal">(students can see this course)</span>
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-700 font-medium text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              {isEditing ? 'Saving…' : 'Creating…'}
            </>
          ) : (
            <>
              <Save size={16} aria-hidden="true" />
              {isEditing ? 'Save Changes' : 'Create Course'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
