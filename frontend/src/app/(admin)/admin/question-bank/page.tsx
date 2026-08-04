'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  CheckCircle2,
  Database,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  deleteBankQuestion,
  getBankQuestions,
  type BankQuestion,
  type QuestionDifficulty,
} from '@/app/actions/questionBankActions';
import {
  getCategoriesWithSubjects,
  type QuizCategoryWithSubjects,
} from '@/app/actions/taxonomyActions';
import { AddBankQuestionModal } from '@/components/admin/AddBankQuestionModal';
import { Spinner } from '@/components/ui/Spinner';

function getRelationName(relation?: { name?: string | null } | { name?: string | null }[] | null): string {
  if (!relation) return '';
  if (Array.isArray(relation)) return relation[0]?.name || '';
  return relation.name || '';
}

export default function QuestionBankVaultPage() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [taxonomy, setTaxonomy] = useState<QuizCategoryWithSubjects[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedSearch, setSubmittedSearch] = useState<string>('');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchTaxonomy = async () => {
    try {
      const data = await getCategoriesWithSubjects();
      setTaxonomy(data);
    } catch (err) {
      console.error('Failed to load taxonomy:', err);
    }
  };

  const fetchQuestions = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);

    try {
      const [data] = await Promise.all([getBankQuestions(), fetchTaxonomy()]);
      setQuestions(data);
    } catch {
      setError('Failed to load question bank entries');
      setQuestions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Filter available subjects based on selected category
  const availableSubjects = useMemo(() => {
    if (!selectedCategoryId) return [];
    const cat = taxonomy.find((c) => c.id === selectedCategoryId);
    return cat ? cat.subjects : [];
  }, [taxonomy, selectedCategoryId]);

  // Client-side filtering for fast interactive feedback
  const filteredQuestions = useMemo(() => {
    const query = submittedSearch.trim().toLowerCase();

    return questions.filter((item) => {
      // Category filter
      if (selectedCategoryId && item.category_id !== selectedCategoryId) {
        const catName = taxonomy.find((c) => c.id === selectedCategoryId)?.name;
        const quizCatName = getRelationName(item.category);
        if (quizCatName !== catName) return false;
      }

      // Subject filter
      if (selectedSubjectId && item.subject_id !== selectedSubjectId) {
        const subjName = availableSubjects.find((s) => s.id === selectedSubjectId)?.name;
        const quizSubjName = getRelationName(item.subject);
        if (quizSubjName !== subjName) return false;
      }

      // Difficulty filter
      if (selectedDifficulty && item.difficulty !== selectedDifficulty) {
        return false;
      }

      // Search Query filter
      if (query) {
        const catName = getRelationName(item.category);
        const subjName = getRelationName(item.subject);
        const tagsStr = (item.tags || []).join(' ');
        const haystack = [item.question_text, item.option_a, item.option_b, item.option_c, item.option_d, catName, subjName, tagsStr]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [questions, selectedCategoryId, selectedSubjectId, selectedDifficulty, submittedSearch, taxonomy, availableSubjects]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedSearch(searchQuery);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this question from the bank? This action cannot be undone.')) return;

    try {
      await deleteBankQuestion(id);
      toast.success('Question deleted from vault');
      await fetchQuestions({ silent: true });
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const getDifficultyBadge = (difficulty: QuestionDifficulty) => {
    switch (difficulty) {
      case 'EASY':
        return (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            EASY
          </span>
        );
      case 'HARD':
        return (
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">
            HARD
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            MEDIUM
          </span>
        );
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
            Question Bank Vault
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b5a68]">
            Master Repository — Store, filter, tag, and reuse standardized assessment questions.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fetchQuestions({ silent: true })}
            disabled={isRefreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-4 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8]"
          >
            <Plus className="h-4 w-4" />
            + Add to Bank
          </button>
        </div>
      </div>

      {/* ── Sidebar Filters & Main Content Layout ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Sidebar Filter Panel */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[#e4e6ef] bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#eceef5] pb-3 text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
              <Filter className="h-4 w-4 text-[#3525cd]" />
              <span>Vault Filters</span>
            </div>

            <form onSubmit={handleSearch} className="mt-4 space-y-4">
              {/* Search Query Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#696778]">
                  Search Text
                </label>
                <div className="relative mt-1.5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777586]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search prompt, options, tags..."
                    className="min-h-10 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] py-2 pl-9 pr-3 text-xs text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#696778]">
                  Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedSubjectId('');
                  }}
                  className="mt-1.5 min-h-10 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="">All Categories</option>
                  {taxonomy.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#696778]">
                  Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={!selectedCategoryId || availableSubjects.length === 0}
                  className="mt-1.5 min-h-10 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white disabled:opacity-50"
                >
                  <option value="">All Subjects</option>
                  {availableSubjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#696778]">
                  Difficulty
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="mt-1.5 min-h-10 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="">All Difficulties</option>
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-9 rounded-xl bg-[#3525cd] px-3 text-xs font-semibold text-white transition hover:bg-[#2f20b8]"
                >
                  Apply Filters
                </button>
                {(selectedCategoryId || selectedSubjectId || selectedDifficulty || searchQuery || submittedSearch) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId('');
                      setSelectedSubjectId('');
                      setSelectedDifficulty('');
                      setSearchQuery('');
                      setSubmittedSearch('');
                    }}
                    className="rounded-xl border border-[#dadce5] bg-white px-3 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-[#e4e6ef] bg-white">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfd1dc] bg-white p-12 text-center shadow-xs">
              <Database className="mx-auto h-10 w-10 text-[#8d8b99]" />
              <h3 className="mt-4 text-base font-bold text-[#191c1e]">No vault questions found</h3>
              <p className="mt-1 text-xs leading-5 text-[#696778]">
                {submittedSearch || selectedCategoryId || selectedSubjectId || selectedDifficulty
                  ? 'No questions match your current filter settings. Try resetting filters.'
                  : 'Start populating the master question bank by adding your first entry.'}
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white transition hover:bg-[#2f20b8]"
              >
                <Plus className="h-4 w-4" />
                + Add to Bank
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-[#696778]">
                  Showing {filteredQuestions.length} question{filteredQuestions.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#e4e6ef] bg-white shadow-xs">
                <div className="divide-y divide-[#eceef5]">
                  {filteredQuestions.map((q) => {
                    const catName = getRelationName(q.category);
                    const subjName = getRelationName(q.subject);

                    return (
                      <div key={q.id} className="p-5 transition hover:bg-[#fbfbfd]">
                        {/* Top row: Badges & Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {getDifficultyBadge(q.difficulty)}
                            {catName ? (
                              <span className="rounded-full bg-[#f1f0ff] px-2.5 py-0.5 text-xs font-semibold text-[#3525cd]">
                                {catName}
                              </span>
                            ) : null}
                            {subjName ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                {subjName}
                              </span>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDelete(q.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                            title="Delete question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Question Text */}
                        <h3 className="mt-3 text-sm font-bold leading-snug text-[#191c1e]">
                          {q.question_text}
                        </h3>

                        {/* Choices Grid */}
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                          <div className={`rounded-xl border p-2.5 ${q.correct_option === 'A' ? 'border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-900' : 'border-[#e4e6ef] bg-[#f7f7fb] text-[#4b4a58]'}`}>
                            <span className="font-bold text-[#3525cd]">A:</span> {q.option_a}
                            {q.correct_option === 'A' ? <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-600" /> : null}
                          </div>

                          <div className={`rounded-xl border p-2.5 ${q.correct_option === 'B' ? 'border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-900' : 'border-[#e4e6ef] bg-[#f7f7fb] text-[#4b4a58]'}`}>
                            <span className="font-bold text-[#3525cd]">B:</span> {q.option_b}
                            {q.correct_option === 'B' ? <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-600" /> : null}
                          </div>

                          <div className={`rounded-xl border p-2.5 ${q.correct_option === 'C' ? 'border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-900' : 'border-[#e4e6ef] bg-[#f7f7fb] text-[#4b4a58]'}`}>
                            <span className="font-bold text-[#3525cd]">C:</span> {q.option_c}
                            {q.correct_option === 'C' ? <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-600" /> : null}
                          </div>

                          <div className={`rounded-xl border p-2.5 ${q.correct_option === 'D' ? 'border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-900' : 'border-[#e4e6ef] bg-[#f7f7fb] text-[#4b4a58]'}`}>
                            <span className="font-bold text-[#3525cd]">D:</span> {q.option_d}
                            {q.correct_option === 'D' ? <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-600" /> : null}
                          </div>
                        </div>

                        {/* Explanation & Tags Footer */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#eceef5] pt-3 text-xs text-[#777586]">
                          {q.explanation ? (
                            <p className="line-clamp-1 italic text-[#696778]">
                              <span className="font-semibold not-italic text-[#191c1e]">Explanation:</span> {q.explanation}
                            </p>
                          ) : <div />}

                          {q.tags && q.tags.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Tag className="h-3 w-3 text-[#3525cd]" />
                              {q.tags.map((tag, idx) => (
                                <span key={idx} className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200/60">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Bank Question Modal */}
      <AddBankQuestionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        taxonomy={taxonomy}
        onSuccess={() => fetchQuestions({ silent: true })}
      />
    </div>
  );
}
