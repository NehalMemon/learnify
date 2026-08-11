'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Calendar, Check, Clock, Loader2, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { createLiveClass } from '@/actions/live-class';
import type { CreateLiveClassPayload } from '@/types/live-class';

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface CreateClassFormProps {
  /** All courses the admin can schedule a class against (id + title for the dropdown) */
  courses: { id: string; title: string }[];
  availableTeachers: { id: string; name: string }[];
  availableStudents: { id: string; name: string }[];
  /** Called after a successful create so the parent can close the modal / refresh. */
  onSuccess?: () => void;
}

interface FormState {
  courseId: string;
  title: string;
  description: string;
  /** Raw `<input type="datetime-local">` value, e.g. "2026-08-10T14:30". */
  startTime: string;
  endTime: string;
  teacherId: string;
  studentIds: string[];
}

interface FieldErrors {
  courseId?: string;
  title?: string;
  teacherId?: string;
  startTime?: string;
  endTime?: string;
}

const EMPTY_FORM: FormState = {
  courseId: '',
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  teacherId: '',
  studentIds: [],
};

/* ── Shared classes (match the dashboard design system) ───────────────── */

const inputBase =
  'w-full px-3 py-2 bg-white border rounded-lg text-gray-900 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 ' +
  'disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors';

const inputError = 'border-red-400 focus:border-red-400 focus:ring-red-500/20';
const inputOk = 'border-gray-300';

/** Hides native number spinners (datetime-local pickers in some browsers). */
const hideNumberSpinners =
  '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** Hidden scrollbars for the student roster. */
const scrollbarHide = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* ── Component ─────────────────────────────────────────────────────────── */

export function CreateClassForm({
  courses,
  availableTeachers,
  availableStudents,
  onSuccess,
}: CreateClassFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const selectedCount = form.studentIds.length;
  const allSelected = availableStudents.length > 0 && selectedCount === availableStudents.length;
  const someSelected = selectedCount > 0 && !allSelected;

  // Reflect the "some selected" state on the Select All checkbox.
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear the field error as soon as the user fixes it.
    setErrors((prev) =>
      name in prev ? { ...prev, [name]: undefined } : prev
    );
  };

  const toggleStudent = (studentId: string) => {
    setForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((id) => id !== studentId)
        : [...prev.studentIds, studentId],
    }));
  };

  const toggleSelectAll = () => {
    setForm((prev) => ({
      ...prev,
      studentIds: allSelected ? [] : availableStudents.map((s) => s.id),
    }));
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!form.courseId) next.courseId = 'Please select a course.';
    if (!form.title.trim()) next.title = 'Class title is required.';
    if (!form.teacherId) next.teacherId = 'Please assign a teacher.';
    if (!form.startTime) next.startTime = 'Start time is required.';
    if (!form.endTime) next.endTime = 'End time is required.';
    if (
      form.startTime &&
      form.endTime &&
      new Date(form.startTime).getTime() >= new Date(form.endTime).getTime()
    ) {
      next.endTime = 'End time must be after the start time.';
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    // Map local state → CreateLiveClassPayload.
    // start_time/end_time are floating datetime-local strings (no offset);
    // the server action interprets them in the server's local timezone and
    // normalizes to UTC before persisting.
    const payload: CreateLiveClassPayload = {
      course_id: form.courseId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      teacher_id: form.teacherId,
      student_ids: form.studentIds,
      start_time: form.startTime,
      end_time: form.endTime,
      recurrence: 'NONE',
      recurrence_days: [],
    };

    setIsSubmitting(true);
    try {
      const result = await createLiveClass(payload);
      if (!result.success) {
        toast.error(result.error || 'Failed to schedule the live class. Please try again.');
        return;
      }
      // Surface the teacher-Google-connection warning (if any) so the admin
      // knows the Meet meeting won't be created on the teacher's calendar yet.
      if ('warning' in result && result.warning) {
        toast(result.warning, { icon: '⚠️', duration: 6000 });
      } else {
        toast.success('Live class scheduled successfully!');
      }
      setForm(EMPTY_FORM);
      setErrors({});
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* ── Course ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Course</h3>
            <p className="text-xs text-gray-500">Which course this session belongs to</p>
          </div>
        </div>

        <div>
          <label htmlFor="cc-course" className="mb-1 block text-sm font-medium text-gray-700">
            Associated Course <span className="text-red-500">*</span>
          </label>
          <select
            id="cc-course"
            name="courseId"
            value={form.courseId}
            onChange={handleChange}
            disabled={isSubmitting || courses.length === 0}
            className={`${inputBase} ${errors.courseId ? inputError : inputOk}`}
            aria-invalid={Boolean(errors.courseId)}
            aria-describedby={errors.courseId ? 'cc-course-err' : undefined}
          >
            <option value="">
              {courses.length === 0 ? 'No courses available' : '— Select course —'}
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          {errors.courseId && (
            <p id="cc-course-err" role="alert" className="mt-1 text-xs text-red-600">
              {errors.courseId}
            </p>
          )}
        </div>
      </section>

      {/* ── Class Details ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Calendar className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Class Details</h3>
            <p className="text-xs text-gray-500">Basic information about this session</p>
          </div>
        </div>

        <div>
          <label htmlFor="cc-title" className="mb-1 block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="cc-title"
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="e.g. MDCAT Biology — Nervous System"
            autoComplete="off"
            className={`${inputBase} focus:select-all ${errors.title ? inputError : inputOk}`}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'cc-title-err' : undefined}
          />
          {errors.title && (
            <p id="cc-title-err" role="alert" className="mt-1 text-xs text-red-600">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cc-description" className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="cc-description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="Optional — topics covered, materials to bring, etc."
            className={`${inputBase} resize-none`}
          />
        </div>
      </section>

      {/* ── Schedule ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Schedule</h3>
            <p className="text-xs text-gray-500">A Google Meet link is generated before the start time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cc-start" className="mb-1 block text-sm font-medium text-gray-700">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              id="cc-start"
              type="datetime-local"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`${inputBase} ${hideNumberSpinners} ${errors.startTime ? inputError : inputOk}`}
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={errors.startTime ? 'cc-start-err' : undefined}
            />
            {errors.startTime && (
              <p id="cc-start-err" role="alert" className="mt-1 text-xs text-red-600">
                {errors.startTime}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cc-end" className="mb-1 block text-sm font-medium text-gray-700">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              id="cc-end"
              type="datetime-local"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`${inputBase} ${hideNumberSpinners} ${errors.endTime ? inputError : inputOk}`}
              aria-invalid={Boolean(errors.endTime)}
              aria-describedby={errors.endTime ? 'cc-end-err' : undefined}
            />
            {errors.endTime && (
              <p id="cc-end-err" role="alert" className="mt-1 text-xs text-red-600">
                {errors.endTime}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Teacher Assignment ────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Teacher</h3>
            <p className="text-xs text-gray-500">Who leads this session</p>
          </div>
        </div>

        <div>
          <label htmlFor="cc-teacher" className="mb-1 block text-sm font-medium text-gray-700">
            Assigned Teacher <span className="text-red-500">*</span>
          </label>
          <select
            id="cc-teacher"
            name="teacherId"
            value={form.teacherId}
            onChange={handleChange}
            disabled={isSubmitting || availableTeachers.length === 0}
            className={`${inputBase} ${errors.teacherId ? inputError : inputOk}`}
            aria-invalid={Boolean(errors.teacherId)}
            aria-describedby={errors.teacherId ? 'cc-teacher-err' : undefined}
          >
            <option value="">
              {availableTeachers.length === 0 ? 'No teachers available' : '— Select teacher —'}
            </option>
            {availableTeachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          {errors.teacherId && (
            <p id="cc-teacher-err" role="alert" className="mt-1 text-xs text-red-600">
              {errors.teacherId}
            </p>
          )}
        </div>
      </section>

      {/* ── Student Enrollment ────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Users className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Students</h3>
            <p className="text-xs text-gray-500">Choose who attends this live class</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          {/* Select All toolbar */}
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-semibold text-gray-800">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                disabled={isSubmitting || availableStudents.length === 0}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed"
              />
              Select All
            </label>
            <span className="text-xs font-medium text-gray-500">
              {selectedCount} / {availableStudents.length} selected
            </span>
          </div>

          {/* Scrollable roster */}
          <div className={`max-h-56 overflow-y-auto ${scrollbarHide}`}>
            {availableStudents.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                No students available for this course yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {availableStudents.map((student) => {
                  const isSelected = form.studentIds.includes(student.id);
                  return (
                    <li key={student.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                          isSelected ? 'bg-purple-50/60' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(student.id)}
                          disabled={isSubmitting}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed"
                        />
                        <span className={`truncate ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {student.name}
                        </span>
                        {isSelected && (
                          <Check className="ml-auto h-4 w-4 shrink-0 text-purple-600" aria-hidden="true" />
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Submit ─────────────────────────────────────────────── */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-purple-300 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Scheduling…
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Schedule Class
            </>
          )}
        </button>
      </div>
    </form>
  );
}
