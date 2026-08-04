'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  CheckCircle2,
  Database,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteBankQuestion,
  getBankQuestions,
  type BankQuestion,
  type BankQuestionType,
  type QuestionDifficulty,
} from '@/app/actions/questionBankActions';
import {
  getCategoriesWithSubjects,
  type QuizCategoryWithSubjects,
} from '@/app/actions/taxonomyActions';
import { Spinner } from '@/components/ui/Spinner';

function getRelationName(relation?: { name?: string | null } | { name?: string | null }[] | null): string {
  if (!relation) return '';
  if (Array.isArray(relation)) return relation[0]?.name || '';
  return relation.name || '';
}

export default function QuestionBankVaultPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [taxonomy, setTaxonomy] = useState<QuizCategoryWithSubjects[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedSearch, setSubmittedSearch] = useState<string>('');

  // Gateway Modal State
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayCatId, setGatewayCatId] = useState<string>('');
  const [gatewaySubjId, setGatewaySubjId] = useState<string>('');

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

  const availableSubjects = useMemo(() => {
    if (!selectedCategoryId) return [];
    const cat = taxonomy.find((c) => c.id === selectedCategoryId);
    return cat ? cat.subjects : [];
  }, [taxonomy, selectedCategoryId]);

  const gatewayAvailableSubjects = useMemo(() => {
    if (!gatewayCatId) return [];
    const cat = taxonomy.find((c) => c.id === gatewayCatId);
    return cat ? cat.subjects : [];
  }, [taxonomy, gatewayCatId]);

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

      // Type filter
      if (selectedType && item.type !== selectedType) {
        return false;
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
        const optionsStr = JSON.stringify(item.content || {});
        const haystack = [item.question_text, catName, subjName, tagsStr, optionsStr]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [questions, selectedCategoryId, selectedSubjectId, selectedType, selectedDifficulty, submittedSearch, taxonomy, availableSubjects]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedSearch(searchQuery);
  };

  const handleResetFilters = () => {
    setSelectedCategoryId('');
    setSelectedSubjectId('');
    setSelectedType('');
    setSelectedDifficulty('');
    setSearchQuery('');
    setSubmittedSearch('');
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

  const handleStartBuilding = () => {
    if (!gatewayCatId) {
      toast.error('Please select a target Category first.');
      return;
    }

    const params = new URLSearchParams();
    params.set('categoryId', gatewayCatId);
    if (gatewaySubjId) {
      params.set('subjectId', gatewaySubjId);
    }

    router.push(`/admin/question-bank/builder?${params.toString()}`);
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

  const getTypeBadge = (type: BankQuestionType) => {
    switch (type) {
      case 'SINGLE_CHOICE':
        return (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/60">
            Single Choice
          </span>
        );
      case 'MULTIPLE_CHOICE':
        return (
          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200/60">
            Multiple Choice
          </span>
        );
      case 'TRUE_FALSE':
        return (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/60">
            True / False
          </span>
        );
      case 'SHORT_ANSWER':
        return (
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 border border-teal-200/60">
            Short Answer
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700">
            {type}
          </span>
        );
    }
  };

  const isFiltered = Boolean(selectedCategoryId || selectedSubjectId || selectedType || selectedDifficulty || searchQuery || submittedSearch);

  return (
    <div className="mx-auto w-full max-w-7xl pb-10 font-sans text-[#191c1e] antialiased">
      {/* Page Header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
            Admin Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#191c1e] md:text-4xl">
            Question Bank Vault
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b5a68]">
            Master Repository — Store, filter, tag, and reuse multi-type assessment questions.
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
            onClick={() => {
              setGatewayCatId('');
              setGatewaySubjId('');
              setIsGatewayModalOpen(true);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8]"
          >
            <Plus className="h-4 w-4" />
            + Add to Bank
          </button>
        </div>
      </div>

      {/* Main Vertical Stack Container */}
      <div className="flex flex-col gap-6 w-full">
        {/* Horizontal Top-Bar Filter Card */}
        <div className="w-full rounded-2xl border border-[#e4e6ef] bg-white p-4 shadow-xs">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-center w-full">
            {/* 1. Search Query Input */}
            <div className="relative col-span-1 lg:col-span-2">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777586]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompt, choices, tags..."
                className="min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] py-2 pl-10 pr-4 text-xs font-medium text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#3525cd] focus:bg-white"
              />
            </div>

            {/* 2. Category Filter */}
            <div className="w-full">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedSubjectId('');
                }}
                className="min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-xs font-medium text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
              >
                <option value="">All Categories</option>
                {taxonomy.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Subject Filter */}
            <div className="w-full">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedCategoryId || availableSubjects.length === 0}
                className="min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-xs font-medium text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white disabled:opacity-50"
              >
                <option value="">All Subjects</option>
                {availableSubjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                    {subj.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Question Type Filter */}
            <div className="w-full">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-xs font-medium text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
              >
                <option value="">All Types</option>
                <option value="SINGLE_CHOICE">Single Choice</option>
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
              </select>
            </div>

            {/* 5. Difficulty Filter & Action Buttons */}
            <div className="flex items-center gap-2 w-full">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="min-h-11 flex-1 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs font-medium text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
              >
                <option value="">Difficulty</option>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>

              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#3525cd] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2f20b8] shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </button>

              {isFiltered ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#dadce5] bg-white text-[#4b4a58] transition hover:bg-[#f7f7fb] shrink-0"
                  title="Reset filters"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </form>
        </div>

        {/* Main Content Area */}
        <div className="w-full min-w-0">
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
                {submittedSearch || selectedCategoryId || selectedSubjectId || selectedType || selectedDifficulty
                  ? 'No questions match your current filter settings. Try resetting filters.'
                  : 'Start populating the master question bank by adding your first entry.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setGatewayCatId('');
                  setGatewaySubjId('');
                  setIsGatewayModalOpen(true);
                }}
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
                {isFiltered ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-[#3525cd] hover:underline"
                  >
                    Clear all filters
                  </button>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#e4e6ef] bg-white shadow-xs">
                <div className="divide-y divide-[#eceef5]">
                  {filteredQuestions.map((q) => {
                    const catName = getRelationName(q.category);
                    const subjName = getRelationName(q.subject);

                    const optionsList: { id: string; text: string }[] =
                      Array.isArray(q.content?.options)
                        ? q.content.options
                        : q.option_a
                        ? [
                            { id: 'A', text: q.option_a },
                            { id: 'B', text: q.option_b },
                            { id: 'C', text: q.option_c },
                            { id: 'D', text: q.option_d },
                          ]
                        : [];

                    const correctVal = q.correct_answer?.value;
                    const correctVals: string[] = Array.isArray(q.correct_answer?.values)
                      ? q.correct_answer.values
                      : correctVal
                      ? [String(correctVal)]
                      : q.correct_option
                      ? [q.correct_option]
                      : [];

                    return (
                      <div key={q.id} className="p-5 transition hover:bg-[#fbfbfd]">
                        {/* Top row: Badges & Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {getTypeBadge(q.type)}
                            {getDifficultyBadge(q.difficulty)}
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                              {q.points || 1} pt{q.points === 1 ? '' : 's'}
                            </span>
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

                        {/* Choices / Answers Preview */}
                        {q.type === 'SHORT_ANSWER' ? (
                          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 text-xs text-emerald-900 font-medium">
                            <span className="font-bold text-emerald-800">Accepted Answer: </span>
                            "{correctVal || 'N/A'}"
                          </div>
                        ) : optionsList.length > 0 ? (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                            {optionsList.map((opt) => {
                              const isCorrect = correctVals.includes(opt.id) || (q.correct_option && q.correct_option === opt.id);
                              return (
                                <div
                                  key={opt.id}
                                  className={`rounded-xl border p-2.5 ${
                                    isCorrect
                                      ? 'border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-900'
                                      : 'border-[#e4e6ef] bg-[#f7f7fb] text-[#4b4a58]'
                                  }`}
                                >
                                  <span className="font-bold text-[#3525cd]">{opt.id}: </span>
                                  {opt.text}
                                  {isCorrect ? (
                                    <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-600" />
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

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
                                <span
                                  key={idx}
                                  className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200/60"
                                >
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

      {/* Gateway Modal for Mass Entry Builder */}
      {isGatewayModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-[#eceef5]">
            <div className="flex items-center justify-between border-b border-[#eceef5] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#191c1e]">Mass Question Builder</h3>
                  <p className="text-xs text-[#696778]">Select target Category & Subject to begin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGatewayModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777586] transition hover:bg-[#f7f7fb] hover:text-[#191c1e]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Category Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Target Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={gatewayCatId}
                  onChange={(e) => {
                    setGatewayCatId(e.target.value);
                    setGatewaySubjId('');
                  }}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="">Select Category...</option>
                  {taxonomy.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Target Subject <span className="text-[#777586] font-normal">(Optional)</span>
                </label>
                <select
                  value={gatewaySubjId}
                  onChange={(e) => setGatewaySubjId(e.target.value)}
                  disabled={!gatewayCatId || gatewayAvailableSubjects.length === 0}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white disabled:opacity-50"
                >
                  <option value="">All / No Specific Subject</option>
                  {gatewayAvailableSubjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#eceef5]">
                <button
                  type="button"
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="min-h-10 rounded-xl border border-[#dadce5] bg-white px-4 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartBuilding}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-5 text-xs font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8]"
                >
                  Start Building →
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
