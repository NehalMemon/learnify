'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  X,
  Loader2,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  Search,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getBankQuestions, type BankQuestion } from '@/app/actions/questionBankActions';

export interface AddFromBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  subjectId?: string;
  onImport: (questions: any[]) => void;
}

export function AddFromBankModal({
  isOpen,
  onClose,
  categoryId,
  subjectId,
  onImport,
}: AddFromBankModalProps) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  const fetchVaultQuestions = useCallback(async () => {
    if (!categoryId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBankQuestions({
        category_id: categoryId,
        subject_id: subjectId,
      });
      setQuestions(data || []);
      setSelectedQuestionIds([]);
      setSearchQuery('');
      setFilterType('ALL');
      setFilterDifficulty('ALL');
    } catch (err: any) {
      console.error('Failed to fetch bank questions:', err);
      setError(err?.message || 'Failed to load questions from vault.');
      toast.error('Failed to load questions from category vault.');
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, subjectId]);

  useEffect(() => {
    if (isOpen) {
      fetchVaultQuestions();
    }
  }, [isOpen, fetchVaultQuestions]);

  if (!isOpen) return null;

  // Derived filtered questions
  const displayedQuestions = questions.filter((q) => {
    const matchesSearch =
      !searchQuery.trim() ||
      q.question_text.toLowerCase().includes(searchQuery.trim().toLowerCase());

    const matchesType =
      filterType === 'ALL' ||
      (q.type as string) === filterType ||
      (filterType === 'MULTIPLE_CHOICE' && (q.type as string) === 'MULTIPLE_SELECT');

    const matchesDifficulty =
      filterDifficulty === 'ALL' || q.difficulty === filterDifficulty;

    return matchesSearch && matchesType && matchesDifficulty;
  });

  const displayedIds = displayedQuestions.map((q) => q.id);
  const isAllDisplayedSelected =
    displayedIds.length > 0 && displayedIds.every((id) => selectedQuestionIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllDisplayedSelected) {
      // Deselect all currently displayed questions
      setSelectedQuestionIds((prev) => prev.filter((id) => !displayedIds.includes(id)));
    } else {
      // Select all currently displayed questions
      setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleToggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmImport = () => {
    const selectedQuestions = questions.filter((q) => selectedQuestionIds.includes(q.id));
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question to import.');
      return;
    }

    const mappedQuestions = selectedQuestions.map((q) => {
      let type: string = q.type;
      if (type === 'MULTIPLE_CHOICE') type = 'MULTIPLE_SELECT';

      const optionA = q.option_a || q.content?.optionA || q.content?.options?.[0] || '';
      const optionB = q.option_b || q.content?.optionB || q.content?.options?.[1] || '';
      const optionC = q.option_c || q.content?.optionC || q.content?.options?.[2] || '';
      const optionD = q.option_d || q.content?.optionD || q.content?.options?.[3] || '';
      const correctOption = q.correct_option || q.correct_answer?.value || 'A';

      return {
        id: crypto.randomUUID(), // CRITICAL: strip DB ID and assign fresh temporary ID
        type,
        questionText: q.question_text || '',
        question_text: q.question_text || '',
        optionA,
        optionB,
        optionC,
        optionD,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        matchA: q.content?.matchA || '',
        matchB: q.content?.matchB || '',
        matchC: q.content?.matchC || '',
        matchD: q.content?.matchD || '',
        correctOption,
        correct_option: correctOption,
        explanation: q.explanation || '',
      };
    });

    onImport(mappedQuestions);
    onClose();
  };

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'SINGLE_CHOICE':
        return (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            Single Choice
          </span>
        );
      case 'MULTIPLE_CHOICE':
      case 'MULTIPLE_SELECT':
        return (
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            Multiple Select
          </span>
        );
      case 'TRUE_FALSE':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            True / False
          </span>
        );
      case 'SHORT_ANSWER':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            Short Answer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            {type}
          </span>
        );
    }
  };

  const renderDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
            Easy
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'HARD':
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
            Hard
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
            {difficulty}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl transition-all border border-[#eceef5] flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#eceef5] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#191c1e]">Import Questions from Vault</h3>
              <p className="text-xs text-[#696778]">
                Select questions from the category vault to pull directly into your quiz
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777586] transition hover:bg-[#f7f7fb] hover:text-[#191c1e]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#3525cd]" />
              <p className="text-xs font-semibold text-gray-500">Loading vault questions...</p>
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
              <h4 className="text-sm font-bold text-gray-900">Failed to load questions</h4>
              <p className="mt-1 text-xs text-gray-500 max-w-md">{error}</p>
              <button
                type="button"
                onClick={fetchVaultQuestions}
                className="mt-4 rounded-xl bg-[#3525cd] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f20b8]"
              >
                Try Again
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <HelpCircle className="h-10 w-10 text-gray-400 mb-2" />
              <h4 className="text-sm font-bold text-gray-900">No questions found</h4>
              <p className="mt-1 text-xs text-gray-500 max-w-md">
                There are no questions in this category vault yet. Add questions to the Question Bank first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search prompt..."
                    className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/15"
                  />
                </div>

                {/* Type Select Dropdown */}
                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2 px-3 text-xs text-gray-900 outline-none transition focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/15"
                  >
                    <option value="ALL">All Types</option>
                    <option value="SINGLE_CHOICE">Single Choice</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="TRUE_FALSE">True/False</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                  </select>
                </div>

                {/* Difficulty Select Dropdown */}
                <div>
                  <select
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2 px-3 text-xs text-gray-900 outline-none transition focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/15"
                  >
                    <option value="ALL">All Difficulties</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              {/* Select All / Counter Bar */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 px-1">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={displayedQuestions.length === 0}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#3525cd] transition hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {isAllDisplayedSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {isAllDisplayedSelected
                    ? 'Deselect Filtered'
                    : `Select All Filtered (${displayedQuestions.length})`}
                </button>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200">
                  {selectedQuestionIds.length} of {questions.length} selected
                </span>
              </div>

              {/* Scrollable Questions List */}
              {displayedQuestions.length === 0 ? (
                <div className="flex py-10 flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-500">
                    No questions match your search or filter criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[44vh] overflow-y-auto pr-1">
                  {displayedQuestions.map((q) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestion(q.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                          isSelected
                            ? 'border-[#3525cd] bg-[#f1f0ff]/40 shadow-xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent container click
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#3525cd] focus:ring-[#3525cd]"
                        />
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {renderTypeBadge(q.type)}
                            {renderDifficultyBadge(q.difficulty)}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                            {q.question_text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#eceef5] pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={selectedQuestionIds.length === 0 || isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3525cd] px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Database className="h-4 w-4" />
            Import {selectedQuestionIds.length} Question
            {selectedQuestionIds.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

