'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  Calendar,
  Clock3,
  Download,
  FolderPlus,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { getAdminQuizzes } from '@/app/actions/quizAdminActions';
import {
  getCategoriesWithSubjects,
  type QuizCategoryWithSubjects,
} from '@/app/actions/taxonomyActions';
import { TaxonomyManager } from '@/components/admin/dashboard/TaxonomyManager';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi } from '@/lib/api';

type QuizCategoryRelation = { id?: string; name?: string | null } | { name?: string | null }[] | null | undefined;
type QuizSubjectRelation = { id?: string; name?: string | null } | { name?: string | null }[] | null | undefined;

interface AdminQuiz {
  id: string;
  title: string;
  category_id?: string | null;
  subject_id?: string | null;
  subject?: string | QuizSubjectRelation;
  year?: number | null;
  duration_sec?: number | null;
  is_published?: boolean | null;
  category?: QuizCategoryRelation;
}

function getCategoryName(category: QuizCategoryRelation): string {
  if (Array.isArray(category)) return category[0]?.name || 'Uncategorized';
  return category?.name || 'Uncategorized';
}

function getSubjectName(subject: string | QuizSubjectRelation): string {
  if (typeof subject === 'string') return subject;
  if (Array.isArray(subject)) return subject[0]?.name || 'General';
  return subject?.name || 'General';
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return 'Not set';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function csvCell(value: string | number | boolean | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export default function QuizLibraryPage() {
  const [allQuizzes, setAllQuizzes] = useState<AdminQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Taxonomy State
  const [taxonomy, setTaxonomy] = useState<QuizCategoryWithSubjects[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(false);

  const limit = 12;

  const fetchTaxonomy = async () => {
    try {
      const data = await getCategoriesWithSubjects();
      setTaxonomy(data);
    } catch (err) {
      console.error('Failed to load taxonomy:', err);
    }
  };

  const fetchQuizzes = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);
    setSelectedIds([]);

    try {
      const [quizzes] = await Promise.all([getAdminQuizzes(), fetchTaxonomy()]);
      setAllQuizzes(Array.isArray(quizzes) ? (quizzes as AdminQuiz[]) : []);
    } catch {
      setError('Failed to load quizzes from Supabase.');
      setAllQuizzes([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Filter available subjects based on selected category
  const availableSubjects = useMemo(() => {
    if (!selectedCategoryId) return [];
    const cat = taxonomy.find((c) => c.id === selectedCategoryId);
    return cat ? cat.subjects : [];
  }, [taxonomy, selectedCategoryId]);

  const filteredQuizzes = useMemo(() => {
    const query = submittedSearch.trim().toLowerCase();

    return allQuizzes.filter((quiz) => {
      // Category filter
      if (selectedCategoryId) {
        const catName = taxonomy.find((c) => c.id === selectedCategoryId)?.name;
        const quizCatName = getCategoryName(quiz.category);
        const matchesCatId = quiz.category_id === selectedCategoryId;
        const matchesCatName = quizCatName === catName;
        if (!matchesCatId && !matchesCatName) return false;
      }

      // Subject filter
      if (selectedSubjectId) {
        const selectedSubjObj = availableSubjects.find((s) => s.id === selectedSubjectId);
        const quizSubjName = getSubjectName(quiz.subject);
        const matchesSubjId = quiz.subject_id === selectedSubjectId;
        const matchesSubjName = selectedSubjObj && quizSubjName === selectedSubjObj.name;
        if (!matchesSubjId && !matchesSubjName) return false;
      }

      // Search Query filter
      if (query) {
        const categoryName = getCategoryName(quiz.category);
        const subjectName = getSubjectName(quiz.subject);
        const haystack = [quiz.title, subjectName, categoryName, quiz.year]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [allQuizzes, submittedSearch, selectedCategoryId, selectedSubjectId, taxonomy, availableSubjects]);

  const totalQuizzes = filteredQuizzes.length;
  const totalPages = Math.max(1, Math.ceil(totalQuizzes / limit));
  const visibleQuizzes = filteredQuizzes.slice((currentPage - 1) * limit, currentPage * limit);

  const allVisibleSelected =
    visibleQuizzes.length > 0 && visibleQuizzes.every((quiz) => selectedIds.includes(quiz.id));

  const showingFrom = totalQuizzes === 0 ? 0 : (currentPage - 1) * limit + 1;
  const showingTo = Math.min(currentPage * limit, totalQuizzes);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittedSearch(searchQuery);
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    const visibleIds = visibleQuizzes.map((quiz) => quiz.id);

    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }

    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  };

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handleExportQuizzes = () => {
    const quizzesToExport = filteredQuizzes;

    if (quizzesToExport.length === 0) {
      toast.error('No quizzes to export');
      return;
    }

    const headers = ['Title', 'Subject', 'Year', 'Duration', 'Status', 'Category'];
    const csvContent = [
      headers.map(csvCell).join(','),
      ...quizzesToExport.map((quiz) =>
        [
          quiz.title,
          getSubjectName(quiz.subject),
          quiz.year || '',
          formatDuration(quiz.duration_sec),
          quiz.is_published ? 'Published' : 'Draft',
          getCategoryName(quiz.category),
        ]
          .map(csvCell)
          .join(',')
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
    URL.revokeObjectURL(url);

    toast.success(`Exported ${quizzesToExport.length} quizzes`);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Delete this quiz? This action is irreversible.')) return;

    try {
      await adminApi.deleteQuiz(quizId);
      toast.success('Quiz deleted successfully');
      await fetchQuizzes({ silent: true });
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete the ${selectedIds.length} selected quizzes?`)) return;

    try {
      await Promise.all(selectedIds.map((id) => adminApi.deleteQuiz(id)));
      toast.success('Selected quizzes deleted successfully');
      setCurrentPage(1);
      await fetchQuizzes({ silent: true });
    } catch {
      toast.error('Failed to delete some quizzes');
    }
  };

  const handleToggleStatus = async (quizId: string, currentStatus: boolean) => {
    const previousQuizzes = allQuizzes;

    setAllQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === quizId ? { ...quiz, is_published: !currentStatus } : quiz
      )
    );

    try {
      await adminApi.toggleQuizStatus(quizId, { isPublished: !currentStatus });
      toast.success(`Quiz ${!currentStatus ? 'published' : 'moved to draft'}`);
      await fetchQuizzes({ silent: true });
    } catch {
      setAllQuizzes(previousQuizzes);
      toast.error('Failed to update status');
    }
  };

  const handleBulkStatus = async (isPublished: boolean) => {
    try {
      await Promise.all(
        selectedIds.map((id) => adminApi.toggleQuizStatus(id, { isPublished }))
      );
      toast.success(`Selected quizzes set to ${isPublished ? 'Published' : 'Draft'}`);
      await fetchQuizzes({ silent: true });
    } catch {
      toast.error('Failed to update status for some quizzes');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl pb-10 font-sans text-[#191c1e] antialiased">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
            Admin Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#191c1e] md:text-4xl">
            Quiz Library
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b5a68]">
            Review, publish, search, filter, and maintain assessments from your quiz catalog.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setIsTaxonomyOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-4 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
          >
            <FolderPlus className="h-4 w-4 text-[#3525cd]" />
            Manage Categories
          </button>
          <button
            type="button"
            onClick={() => fetchQuizzes({ silent: true })}
            disabled={isRefreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-4 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportQuizzes}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-4 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <Link
            href="/admin/quizzes/create/ai"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd]/10 px-4 text-sm font-semibold text-[#3525cd] border border-[#3525cd]/20 transition hover:bg-[#3525cd]/20"
          >
            <Sparkles className="h-4 w-4" />
            Create with AI
          </Link>
          <Link
            href="/admin/quizzes/create"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8]"
          >
            <Plus className="h-4 w-4" />
            Create Quiz
          </Link>
        </div>
      </div>

      {/* ── Search & Filter Bar ──────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#e4e6ef] bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearch} className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777586]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, subject, or category"
              className="min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] py-2 pl-10 pr-4 text-sm text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#4f46e5] focus:bg-white focus:ring-4 focus:ring-[#4f46e5]/10"
            />
          </div>

          {/* Category Filter Select */}
          <select
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setSelectedSubjectId('');
              setCurrentPage(1);
            }}
            className="min-h-11 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-xs font-medium text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white sm:w-44"
          >
            <option value="">All Categories</option>
            {taxonomy.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Subject Filter Select */}
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setCurrentPage(1);
            }}
            disabled={!selectedCategoryId || availableSubjects.length === 0}
            className="min-h-11 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-xs font-medium text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white disabled:opacity-50 sm:w-44"
          >
            <option value="">All Subjects</option>
            {availableSubjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3525cd] px-5 text-sm font-semibold text-white transition hover:bg-[#2f20b8]"
          >
            Search
          </button>
        </form>

        <div className="flex min-h-11 flex-wrap items-center gap-2">
          {selectedIds.length > 0 ? (
            <>
              <span className="rounded-full bg-[#3525cd]/10 px-3 py-1 text-xs font-semibold text-[#3525cd]">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                onClick={() => handleBulkStatus(true)}
                className="rounded-lg border border-[#dadce5] bg-white px-3 py-2 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
              >
                Publish
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus(false)}
                className="rounded-lg border border-[#dadce5] bg-white px-3 py-2 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
              >
                Draft
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                Delete
              </button>
            </>
          ) : (
            <span className="px-1 text-sm text-[#777586]">Select rows for bulk actions</span>
          )}
        </div>
      </div>

      {/* ── Loading Spinner ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center rounded-xl border border-[#e4e6ef] bg-white">
          <Spinner size="lg" />
        </div>
      ) : null}

      {/* ── Error Banner ─────────────────────────────────────────── */}
      {!isLoading && error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {/* ── Quiz Table ───────────────────────────────────────────── */}
      {!isLoading && !error && visibleQuizzes.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[#eceef5] bg-[#fbfbfd] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#191c1e]">Quizzes</h2>
              <p className="text-sm text-[#777586]">
                Showing {showingFrom}-{showingTo} of {totalQuizzes}
                {submittedSearch ? ` matching "${submittedSearch}"` : ''}
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#eceef5] bg-[#f7f7fb]">
                  <th className="w-12 px-5 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => handleSelectAll(event.target.checked)}
                      className="h-4 w-4 rounded border-[#c9cbd6] text-[#3525cd] focus:ring-[#4f46e5]/20"
                      aria-label="Select all visible quizzes"
                    />
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#696778]">Title</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#696778]">Subject</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#696778]">Year</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#696778]">Duration</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#696778]">Category</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#696778]">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-[#696778]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eceef5]">
                {visibleQuizzes.map((quiz) => {
                  const isPublished = Boolean(quiz.is_published);
                  const categoryName = getCategoryName(quiz.category);
                  const subjectName = getSubjectName(quiz.subject);

                  return (
                    <tr key={quiz.id} className="group transition hover:bg-[#fbfbfd]">
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(quiz.id)}
                          onChange={(event) => toggleSelection(quiz.id, event.target.checked)}
                          className="h-4 w-4 rounded border-[#c9cbd6] text-[#3525cd] focus:ring-[#4f46e5]/20"
                          aria-label={`Select ${quiz.title}`}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="max-w-md">
                          <div className="truncate text-sm font-semibold text-[#191c1e]">{quiz.title}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#777586]">
                            <Layers3 className="h-3.5 w-3.5" />
                            {categoryName}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f0ff] px-2.5 py-1 text-xs font-semibold text-[#3525cd]">
                          <Tag className="h-3 w-3" />
                          {subjectName}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-[#4b4a58]">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#8d8b99]" />
                          {quiz.year || 'Any'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-[#4b4a58]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5 text-[#8d8b99]" />
                          {formatDuration(quiz.duration_sec)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#5b5a68]">{categoryName}</td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(quiz.id, isPublished)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                            isPublished
                              ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15'
                              : 'bg-gray-500/10 text-gray-600 hover:bg-gray-500/15'
                          }`}
                          title={isPublished ? 'Move to draft' : 'Publish quiz'}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPublished ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/quizzes/${quiz.id}/edit`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#3525cd] transition hover:bg-[#3525cd]/10"
                            aria-label={`Edit ${quiz.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                            aria-label={`Delete ${quiz.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#eceef5] bg-[#fbfbfd] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-[#696778]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="min-h-10 rounded-lg border border-[#dadce5] bg-white px-4 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="min-h-10 rounded-lg border border-[#dadce5] bg-white px-4 text-sm font-semibold text-[#3525cd] transition hover:bg-[#f1f0ff] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Empty State ─────────────────────────────────────────── */}
      {!isLoading && !error && visibleQuizzes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#cfd1dc] bg-white px-6 py-16 text-center shadow-sm">
          <BookOpen className="mx-auto h-10 w-10 text-[#8d8b99]" />
          <h2 className="mt-4 text-lg font-bold tracking-tight text-[#191c1e]">No quizzes found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#696778]">
            {submittedSearch || selectedCategoryId || selectedSubjectId
              ? 'No Supabase quizzes match your filter criteria. Try clearing search, category, or subject filters.'
              : 'Create your first quiz to start building the assessment catalog.'}
          </p>
          {!submittedSearch && !selectedCategoryId && !selectedSubjectId ? (
            <Link
              href="/admin/quizzes/create"
              className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8]"
            >
              <Plus className="h-4 w-4" />
              Create Quiz
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Taxonomy Manager Slide-over Modal */}
      <TaxonomyManager
        isOpen={isTaxonomyOpen}
        onClose={() => setIsTaxonomyOpen(false)}
        onTaxonomyChange={fetchQuizzes}
      />
    </div>
  );
}
