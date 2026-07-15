'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import {
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks';
import { CourseForm } from '@/components/admin/CourseForm';
import type { CourseFormValues } from '@/components/admin/CourseForm';

// ── Types ──────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  name: string;
  slug: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  courseType: string;
  category?: string;
  price?: number;
  isPublished: boolean;
  createdAt: string;
  division?: Division;
  divisionId?: string;
  classroomUrl?: string;
}

// ── Skeleton row / card ────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex flex-row items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="flex min-w-0 flex-1 items-center gap-4 px-6 py-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="flex gap-3">
            <div className="h-3 bg-gray-200 rounded-full w-16" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="h-7 w-20 bg-gray-200 rounded-lg" />
          <div className="h-7 w-14 bg-gray-200 rounded-lg" />
          <div className="h-7 w-16 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded-full w-16" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-7 w-20 bg-gray-200 rounded-lg" />
        <div className="h-7 w-16 bg-gray-200 rounded-lg" />
        <div className="h-7 w-14 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useViewMode('learnify:admin-courses:viewMode');

  // Edit modal state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const LIMIT = 12;

  // ── Data fetchers ────────────────────────────────────────────────────────

  const fetchCourses = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.listCourses({ page, limit: LIMIT });
      setCourses(res.data.data?.courses || []);
      setTotalPages(res.data.data?.pagination?.pages || res.data.data?.totalPages || 1);
      setCurrentPage(page);
    } catch {
      setError('Failed to load courses. Please try again.');
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDivisions = useCallback(async () => {
    try {
      // Reuse the public catalog endpoint to discover division slugs, or
      // fall back to a static list if no dedicated /divisions route exists.
      const res = await adminApi.listCourses({ limit: 1 });
      // Divisions come from the course objects themselves; deduplicate.
      const seen = new Set<string>();
      const divs: Division[] = [];
      (res.data.data?.courses || []).forEach((c: Course) => {
        if (c.division && !seen.has(c.division.id)) {
          seen.add(c.division.id);
          divs.push(c.division);
        }
      });
      setDivisions(divs);
    } catch {
      // Non-fatal: division select will just be empty
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchDivisions();
  }, [fetchCourses, fetchDivisions]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTogglePublish = async (course: Course) => {
    try {
      await adminApi.updateCourse(course.id, { isPublished: !course.isPublished });
      toast.success(`"${course.title}" ${course.isPublished ? 'unpublished' : 'published'}.`);
      fetchCourses(currentPage);
    } catch {
      toast.error('Failed to update publish status.');
    }
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;

    setDeletingId(course.id);
    try {
      await adminApi.deleteCourse(course.id);
      toast.success(`"${course.title}" deleted.`);
      // Refresh; go back one page if last item on page was deleted
      const nextPage =
        courses.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      fetchCourses(nextPage);
    } catch {
      toast.error('Failed to delete course.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  const handleFormSuccess = () => {
    fetchCourses(currentPage);
  };

  // ── CSV Export ────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      const res = await adminApi.listCourses({ limit: 1000 });
      const all: Course[] = res.data.data?.courses || [];
      if (!all.length) { toast.error('No courses to export.'); return; }

      const headers = ['Title', 'Instructor', 'Category', 'Division', 'Price', 'Status', 'Created'];
      const rows = all.map((c) =>
        [
          `"${c.title}"`,
          `"${c.instructor}"`,
          `"${c.category || ''}"`,
          `"${c.division?.name || ''}"`,
          c.price ?? 0,
          c.isPublished ? 'Published' : 'Draft',
          new Date(c.createdAt).toLocaleDateString(),
        ].join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courses_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} courses.`);
    } catch {
      toast.error('Export failed.');
    }
  };

  // ── Shared action buttons ─────────────────────────────────────────────────

  const ActionButtons = ({ course }: { course: Course }) => (
    <div className="flex shrink-0 items-center gap-2">
      <button
        onClick={() => handleTogglePublish(course)}
        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
          course.isPublished
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
        title={course.isPublished ? 'Unpublish' : 'Publish'}
      >
        {course.isPublished ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        {course.isPublished ? 'Unpublish' : 'Publish'}
      </button>

      <button
        onClick={() => openEditModal(course)}
        className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
        title="Edit course"
      >
        <Edit2 size={16} />
        Edit
      </button>

      <button
        onClick={() => handleDelete(course)}
        disabled={deletingId === course.id}
        className="flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Delete course"
      >
        <Trash2 size={16} />
        {deletingId === course.id ? '…' : 'Delete'}
      </button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses Management</h1>
          <p className="text-gray-500">Manage and organize all courses</p>
        </div>
        <div className="flex gap-3">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 px-4 py-2 rounded-lg text-gray-700 font-medium transition-colors"
          >
            <Download size={18} />
            Export CSV
          </button>
          <Link href="/admin/courses/create">
            <button
              id="add-new-course-btn"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white font-medium transition-colors"
            >
              <Plus size={18} />
              Add New Course
            </button>
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Skeleton loading — Boneyard pattern */}
      {isLoading && (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'grid grid-cols-1 gap-4'
        }>
          {Array.from({ length: 6 }).map((_, i) =>
            viewMode === 'list' ? <SkeletonRow key={i} /> : <SkeletonCard key={i} />
          )}
        </div>
      )}

      {/* Course list / grid */}
      {!isLoading && !error && courses.length > 0 && (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'grid grid-cols-1 gap-4'
          }>
            {courses.map((course) =>
              viewMode === 'list' ? (
                /* ── List row ── */
                <div
                  key={course.id}
                  className="flex flex-row items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            course.isPublished
                              ? 'bg-green-600 text-white'
                              : 'bg-yellow-500 text-white'
                          }`}
                        >
                          {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-sm text-gray-500">{course.instructor}</span>
                        {course.category && (
                          <span className="text-sm text-gray-400">{course.category}</span>
                        )}
                        {course.division && (
                          <span className="text-sm text-gray-400">{course.division.name}</span>
                        )}
                      </div>
                    </div>
                    <ActionButtons course={course} />
                  </div>
                </div>
              ) : (
                /* ── Grid card ── */
                <div
                  key={course.id}
                  className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col gap-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          course.isPublished
                            ? 'bg-green-600 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}
                      >
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p>
                        <span className="font-medium">Instructor:</span> {course.instructor}
                      </p>
                      {course.division && (
                        <p>
                          <span className="font-medium">Division:</span> {course.division.name}
                        </p>
                      )}
                      {course.category && (
                        <p>
                          <span className="font-medium">Category:</span> {course.category}
                        </p>
                      )}
                      {course.price !== undefined && (
                        <p>
                          <span className="font-medium">Price:</span> PKR {course.price}
                        </p>
                      )}
                    </div>
                  </div>
                  <ActionButtons course={course} />
                </div>
              )
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCourses(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded text-sm text-gray-700"
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              <button
                onClick={() => fetchCourses(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded text-sm text-gray-700"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !error && courses.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No courses yet</h3>
          <p className="mt-2 text-gray-500">Get started by creating your first course</p>
          <Link href="/admin/courses/create">
            <button className="mt-6 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium mx-auto">
              <Plus size={18} />
              Add New Course
            </button>
          </Link>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
              <h2 id="edit-modal-title" className="text-xl font-bold text-gray-900">
                Edit Course
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close edit modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <CourseForm
                initialData={
                  editingCourse
                    ? {
                        id: editingCourse.id,
                        title: editingCourse.title,
                        description: editingCourse.description,
                        courseType: editingCourse.courseType as CourseFormValues['courseType'],
                        category: editingCourse.category,
                        instructor: editingCourse.instructor,
                        price: editingCourse.price,
                        divisionId: editingCourse.division?.id ?? editingCourse.divisionId,
                        classroomUrl: editingCourse.classroomUrl,
                        isPublished: editingCourse.isPublished,
                      }
                    : undefined
                }
                divisions={divisions}
                onSuccess={handleFormSuccess}
                onClose={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

