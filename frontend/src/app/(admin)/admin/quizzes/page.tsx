'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from 'react-hot-toast';
import { Search } from 'lucide-react';
import { useViewMode } from '@/hooks';

interface Quiz {
  id: string;
  title: string;
  subject?: string | null;
  year?: number;
  isPublished: boolean;
  category?: { id: string; name: string } | null;
  _count?: {
    questions: number;
  };
}

const ROW_ICON_STYLES = [
  { container: 'bg-primary-fixed text-primary', icon: 'code' },
  { container: 'bg-orange-100 text-orange-600', icon: 'functions' },
  { container: 'bg-emerald-100 text-emerald-600', icon: 'psychology' },
] as const;

function MaterialIcon({
  name,
  className = '',
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined inline-block align-middle ${className}`}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
      }
    >
      {name}
    </span>
  );
}

function questionProgressWidth(count: number): string {
  const pct = Math.min(100, Math.round((count / 40) * 100));
  if (pct >= 100) return 'w-full';
  if (pct >= 75) return 'w-3/4';
  if (pct >= 50) return 'w-1/2';
  if (pct >= 25) return 'w-1/4';
  return 'w-1/12';
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useViewMode('learnify:admin-quizzes:viewMode');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);

  const limit = 12;

  const fetchQuizzes = async (page: number = 1, search: string = '') => {
    setIsLoading(true);
    setError(null);
    setSelectedIds([]);
    try {
      const response = await adminApi.listQuizzes({ search: search || undefined });
      const allQuizzes = Array.isArray(response.data?.data) ? response.data.data : [];
      const total = allQuizzes.length;
      const start = (page - 1) * limit;
      const paginated = allQuizzes.slice(start, start + limit);
      setQuizzes(paginated);
      setTotalQuizzes(total);
      setActiveCount(allQuizzes.filter((quiz) => quiz.isPublished).length);
      setDraftCount(allQuizzes.filter((quiz) => !quiz.isPublished).length);
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
      setCurrentPage(page);
    } catch {
      setError('Failed to load quizzes');
      setQuizzes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string, checked: boolean) => {
    if (checked) setSelectedIds((prev) => [...prev, id]);
    else setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleIds = quizzes.map((q) => q.id);
      setSelectedIds((prev) => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    } else {
      const visibleIds = quizzes.map((q) => q.id);
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this quiz? This action is irreversible and will delete all user attempts.'
      )
    ) {
      return;
    }
    try {
      await adminApi.deleteQuiz(quizId);
      toast.success('Quiz deleted successfully');
      fetchQuizzes(currentPage, searchQuery);
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete the ${selectedIds.length} selected quizzes? This will delete all associated questions and attempts.`
      )
    ) {
      return;
    }
    try {
      await Promise.all(selectedIds.map((id) => adminApi.deleteQuiz(id)));
      toast.success('Selected quizzes deleted successfully');
      setSelectedIds([]);
      fetchQuizzes(1, searchQuery);
    } catch {
      toast.error('Failed to delete some quizzes');
    }
  };

  const handleBulkStatus = async (isPublished: boolean) => {
    try {
      await Promise.all(
        selectedIds.map((id) => adminApi.toggleQuizStatus(id, { isPublished }))
      );
      toast.success(`Selected quizzes set to ${isPublished ? 'Live' : 'Draft'}`);
      setSelectedIds([]);
      fetchQuizzes(currentPage, searchQuery);
    } catch {
      toast.error('Failed to update status for some quizzes');
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuizzes(1, searchQuery);
  };

  const handlePageChange = (page: number) => {
    fetchQuizzes(page, searchQuery);
  };

  const handleExportQuizzes = async () => {
    try {
      const response = await adminApi.listQuizzes();
      const allQuizzes = Array.isArray(response.data?.data) ? response.data.data : [];

      if (allQuizzes.length === 0) {
        alert('No quizzes to export');
        return;
      }

      const headers = ['Title', 'Subject', 'Category', 'Questions Count', 'Status'];
      const csvContent = [
        headers.join(','),
        ...allQuizzes.map((quiz) =>
          [
            `"${quiz.title}"`,
            `"${quiz.subject || '-'}"`,
            `"${quiz.category?.name || '-'}"`,
            quiz._count?.questions ?? 0,
            quiz.isPublished ? 'Live' : 'Draft',
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `quizzes_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Exported ${allQuizzes.length} quizzes successfully`);
    } catch {
      alert('Failed to export quizzes');
    }
  };

  const handleToggleStatus = async (quizId: string, currentStatus: boolean) => {
    const previousQuizzes = [...quizzes];
    setQuizzes((prev) =>
      prev.map((q) => (q.id === quizId ? { ...q, isPublished: !currentStatus } : q))
    );

    try {
      await adminApi.toggleQuizStatus(quizId, { isPublished: !currentStatus });
      toast.success(`Quiz ${!currentStatus ? 'published' : 'moved to draft'}`);
    } catch {
      setQuizzes(previousQuizzes);
      toast.error('Failed to update status');
    }
  };

  const allVisibleSelected = useMemo(
    () => quizzes.length > 0 && quizzes.every((q) => selectedIds.includes(q.id)),
    [quizzes, selectedIds]
  );

  const showingFrom = totalQuizzes === 0 ? 0 : (currentPage - 1) * limit + 1;
  const showingTo = Math.min(currentPage * limit, totalQuizzes);

  return (
    <div className="mx-auto w-full max-w-[1440px] pb-12">
      {/* Page Header */}
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg tracking-tight text-slate-900">
            Quizzes Management
          </h2>
          <p className="mt-1 text-on-surface-variant">
            Organize and track performance of your educational assessments.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleExportQuizzes}
            className="flex items-center gap-2 border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-semibold bg-white hover:bg-slate-50 transition-all"
          >
            <MaterialIcon name="download" className="text-base" />
            Export CSV
          </button>
          <Link href="/admin/quizzes/create">
            <button
              type="button"
              className="flex items-center gap-2 bg-primary-container text-on-primary px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
            >
              <MaterialIcon name="add_circle" />
              Create Full Quiz
            </button>
          </Link>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="bento-card flex h-40 flex-col justify-between rounded-2xl border border-gray-200/75 bg-white p-8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-xs uppercase tracking-wider text-outline">
              Total Quizzes
            </span>
            <div className="rounded-lg bg-primary/5 p-2 text-primary">
              <MaterialIcon name="quiz" />
            </div>
          </div>
          <div>
            <div className="font-headline-md text-3xl font-bold text-slate-900">
              {totalQuizzes}
            </div>
            <div className="mt-1 text-xs font-medium text-secondary">Across all categories</div>
          </div>
        </div>

        <div className="bento-card flex h-40 flex-col justify-between rounded-2xl border border-gray-200/75 bg-white p-8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-xs uppercase tracking-wider text-outline">
              Active
            </span>
            <div className="rounded-lg bg-secondary/5 p-2 text-secondary">
              <MaterialIcon name="rocket_launch" />
            </div>
          </div>
          <div>
            <div className="font-headline-md text-3xl font-bold text-slate-900">{activeCount}</div>
            <div className="mt-1 text-xs font-medium text-on-surface-variant">
              Published and live
            </div>
          </div>
        </div>

        <div className="bento-card flex h-40 flex-col justify-between rounded-2xl border border-gray-200/75 bg-white p-8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-xs uppercase tracking-wider text-outline">
              Drafts
            </span>
            <div className="rounded-lg bg-tertiary/5 p-2 text-tertiary">
              <MaterialIcon name="edit_note" />
            </div>
          </div>
          <div>
            <div className="font-headline-md text-3xl font-bold text-slate-900">{draftCount}</div>
            <div className="mt-1 text-xs font-medium text-on-surface-variant">Requires review</div>
          </div>
        </div>

        <div className="bento-card flex h-40 flex-col justify-between rounded-2xl border border-gray-200/75 bg-white p-8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-xs uppercase tracking-wider text-outline">
              Total Completions
            </span>
            <div className="rounded-lg bg-primary/5 p-2 text-primary">
              <MaterialIcon name="check_circle" />
            </div>
          </div>
          <div>
            <div className="font-headline-md text-3xl font-bold text-slate-900">12.5k</div>
            <div className="mt-1 text-xs font-medium text-secondary">+2.4k this week</div>
          </div>
        </div>
      </div>

      {/* Unified Action Bar */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 mb-6 shadow-sm">
        <form onSubmit={handleSearch} className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center">
          <div className="group relative w-full">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quizzes..."
              className="min-h-[44px] w-full rounded-xl border border-transparent bg-surface-container-low py-2 pl-10 pr-4 text-sm text-gray-900 outline-none transition-all focus:border-primary focus:ring-0"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-all hover:opacity-90"
          >
            Search
          </button>
        </form>

        <div className="flex min-h-[44px] items-center">
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 duration-200 animate-in fade-in zoom-in-95">
              <span className="rounded-full border border-purple-100 bg-primary-fixed px-3 py-1.5 text-sm font-medium text-primary">
                {selectedIds.length} Selected
              </span>
              <button
                type="button"
                onClick={() => handleBulkStatus(true)}
                className="min-h-[40px] rounded-xl border border-surface-variant/50 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-all hover:bg-surface-container"
              >
                Set Live
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus(false)}
                className="min-h-[40px] rounded-xl border border-surface-variant/50 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-all hover:bg-surface-container"
              >
                Set Draft
              </button>
              <div className="mx-1 hidden h-6 w-px bg-surface-variant/50 sm:block" />
              <button
                type="button"
                onClick={handleBulkDelete}
                className="min-h-[40px] rounded-xl border border-red-200 bg-error-container/30 px-3 py-1.5 text-sm font-semibold text-error transition-all hover:bg-error-container/50"
              >
                Delete
              </button>
            </div>
          ) : (
            <span className="text-sm italic text-outline">
              {viewMode === 'list' ? 'Select rows for bulk actions' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      )}

      {/* Main List Bento Card */}
      {!isLoading && !error && quizzes.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200/75 bg-white">
          <div className="flex flex-col gap-4 border-b border-surface-variant/50 bg-surface-container-lowest px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <h3 className="font-headline-md text-slate-900">Recent Quizzes</h3>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-primary">
                  All
                </span>
                {searchQuery ? (
                  <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-outline">
                    &ldquo;{searchQuery}&rdquo;
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg p-2 text-outline transition-all hover:bg-surface-container"
                aria-label="Filter quizzes"
              >
                <MaterialIcon name="filter_list" />
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-outline transition-all hover:bg-surface-container"
                aria-label="Sort quizzes"
              >
                <MaterialIcon name="sort" />
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="w-12 px-4 py-4 sm:px-8">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                      aria-label="Select all quizzes on this page"
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-label-sm uppercase tracking-widest text-outline sm:px-8">
                    Title
                  </th>
                  <th className="px-4 py-4 text-xs font-label-sm uppercase tracking-widest text-outline sm:px-8">
                    Subject
                  </th>
                  <th className="hidden px-4 py-4 text-xs font-label-sm uppercase tracking-widest text-outline md:table-cell sm:px-8">
                    Category
                  </th>
                  <th className="px-4 py-4 text-xs font-label-sm uppercase tracking-widest text-outline sm:px-8">
                    Questions
                  </th>
                  <th className="px-4 py-4 text-xs font-label-sm uppercase tracking-widest text-outline sm:px-8">
                    Status
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-label-sm uppercase tracking-widest text-outline sm:px-8">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant/40">
                {quizzes.map((quiz, index) => {
                  const questionCount = quiz._count?.questions ?? 0;
                  const rowStyle = ROW_ICON_STYLES[index % ROW_ICON_STYLES.length];
                  const subjectLabel = quiz.subject || quiz.category?.name || 'General';
                  const categoryLabel = quiz.category?.name || quiz.subject || '—';

                  return (
                    <tr
                      key={quiz.id}
                      className="group transition-colors hover:bg-surface-bright"
                    >
                      <td className="px-4 py-5 sm:px-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(quiz.id)}
                          onChange={(e) => toggleSelection(quiz.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                          aria-label={`Select ${quiz.title}`}
                        />
                      </td>
                      <td className="px-4 py-5 sm:px-8">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${rowStyle.container}`}
                          >
                            <MaterialIcon name={rowStyle.icon} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 transition-colors group-hover:text-primary">
                              {quiz.title}
                            </div>
                            <div className="text-sm text-slate-500">
                              {quiz.year ? `Year ${quiz.year}` : 'Medical assessment'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 sm:px-8">
                        <span className="inline-block rounded-lg bg-tertiary-fixed px-3 py-1 text-xs font-medium text-on-tertiary-fixed-variant">
                          {subjectLabel}
                        </span>
                      </td>
                      <td className="hidden px-4 py-5 md:table-cell sm:px-8">
                        <span className="inline-block rounded-lg bg-surface-container px-3 py-1 text-xs font-medium text-outline">
                          {categoryLabel}
                        </span>
                      </td>
                      <td className="px-4 py-5 sm:px-8">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-slate-700">{questionCount}</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-primary rounded-full"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 sm:px-8">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(quiz.id, quiz.isPublished)}
                          className="transition-opacity hover:opacity-80"
                          title={quiz.isPublished ? 'Set to draft' : 'Set live'}
                        >
                          {quiz.isPublished ? (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-secondary rounded-full"></span>
                              <span className="font-label-sm text-secondary text-xs font-bold uppercase tracking-wider">
                                Live
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-outline rounded-full"></span>
                              <span className="font-label-sm text-outline text-xs font-bold uppercase tracking-wider">
                                Draft
                              </span>
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-5 text-right sm:px-8">
                        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <Link href={`/admin/quizzes/${quiz.id}/edit`}>
                            <button
                              type="button"
                              className="rounded-lg p-2 text-primary transition-all hover:bg-primary-fixed"
                              title="Edit"
                            >
                              <MaterialIcon name="edit" />
                            </button>
                          </Link>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-outline transition-all hover:bg-surface-container-high"
                            title="View Analytics"
                          >
                            <MaterialIcon name="bar_chart" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            className="rounded-lg p-2 text-error transition-all hover:bg-error-container/10"
                            title="Delete"
                          >
                            <MaterialIcon name="delete" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-surface-variant/30 bg-surface-container-lowest px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <span className="text-sm font-medium text-outline">
              Showing {showingFrom}&ndash;{showingTo} of {totalQuizzes} quizzes
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="min-h-[44px] rounded-xl border border-surface-variant/50 px-4 py-2 text-sm font-semibold text-outline transition-all hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="min-h-[44px] rounded-xl border border-primary/20 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && quizzes.length === 0 && (
        <div className="rounded-2xl border border-gray-200/75 bg-white py-16 text-center">
          <MaterialIcon name="quiz" className="mx-auto text-5xl text-outline" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">No quizzes found</h3>
          <p className="mt-2 text-on-surface-variant">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : 'Get started by creating your first quiz.'}
          </p>
          {!searchQuery && (
            <Link href="/admin/quizzes/create">
              <button
                type="button"
                className="mx-auto mt-6 flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary-container px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
              >
                <MaterialIcon name="add_circle" />
                Create Full Quiz
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Bottom Action Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bento-card flex flex-col justify-between rounded-2xl bg-primary-container p-8 text-on-primary transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div>
            <h4 className="font-headline-md leading-tight">Generate Quiz with AI</h4>
            <p className="mb-6 mt-2 text-sm text-on-primary-container/80">
              Create comprehensive assessments in seconds using your course material.
            </p>
          </div>
          <Link href="/admin/quizzes/create">
            <button
              type="button"
              className="min-h-[44px] w-fit rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary-fixed"
            >
              Try AI Builder
            </button>
          </Link>
        </div>

        <div className="bento-card flex flex-col justify-between rounded-2xl border border-gray-200/75 bg-white p-8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div>
            <h4 className="font-headline-md text-slate-900">Import Questions</h4>
            <p className="mb-6 mt-2 text-sm text-slate-500">
              Upload bulk questions using CSV, JSON or Excel templates.
            </p>
          </div>
          <Link href="/admin/quizzes/import">
            <button
              type="button"
              className="flex min-h-[44px] w-fit items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"
            >
              <MaterialIcon name="upload_file" className="text-sm" />
              Upload File
            </button>
          </Link>
        </div>

        <div className="bento-card flex flex-col justify-between rounded-2xl border border-gray-200/75 bg-white p-8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div>
            <h4 className="font-headline-md text-slate-900">Quiz Settings</h4>
            <p className="mb-6 mt-2 text-sm text-slate-500">
              Manage global time limits, proctoring, and grading rules.
            </p>
          </div>
          <button
            type="button"
            className="flex min-h-[44px] w-fit items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"
          >
            <MaterialIcon name="settings" className="text-sm" />
            Configure
          </button>
        </div>
      </div>
    </div>
  );
}
