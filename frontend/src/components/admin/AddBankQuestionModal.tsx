'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, Database, Loader2, X } from 'lucide-react';
import {
  createBankQuestion,
  type CorrectOption,
  type QuestionDifficulty,
} from '@/app/actions/questionBankActions';
import type { QuizCategoryWithSubjects } from '@/app/actions/taxonomyActions';

interface AddBankQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxonomy: QuizCategoryWithSubjects[];
  onSuccess?: () => void;
}

export function AddBankQuestionModal({
  isOpen,
  onClose,
  taxonomy,
  onSuccess,
}: AddBankQuestionModalProps) {
  const [categoryId, setCategoryId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [questionText, setQuestionText] = useState<string>('');
  const [optionA, setOptionA] = useState<string>('');
  const [optionB, setOptionB] = useState<string>('');
  const [optionC, setOptionC] = useState<string>('');
  const [optionD, setOptionD] = useState<string>('');
  const [correctOption, setCorrectOption] = useState<CorrectOption>('A');
  const [explanation, setExplanation] = useState<string>('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('MEDIUM');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Available subjects based on selected category
  const availableSubjects = useMemo(() => {
    if (!categoryId) return [];
    const cat = taxonomy.find((c) => c.id === categoryId);
    return cat ? cat.subjects : [];
  }, [taxonomy, categoryId]);

  // Reset category/subject if taxonomy changes
  useEffect(() => {
    if (taxonomy.length > 0 && !categoryId) {
      setCategoryId(taxonomy[0].id);
    }
  }, [taxonomy, categoryId]);

  const resetForm = () => {
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectOption('A');
    setExplanation('');
    setDifficulty('MEDIUM');
    setTagsInput('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!questionText.trim()) {
      setFormError('Question text is required.');
      return;
    }

    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setFormError('All four options (A, B, C, D) are required.');
      return;
    }

    // Parse comma-separated tags into cleaned array
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    setIsSubmitting(true);

    try {
      await createBankQuestion({
        category_id: categoryId || null,
        subject_id: subjectId || null,
        question_text: questionText.trim(),
        option_a: optionA.trim(),
        option_b: optionB.trim(),
        option_c: optionC.trim(),
        option_d: optionD.trim(),
        correct_option: correctOption,
        explanation: explanation.trim() || null,
        difficulty,
        tags,
      });

      toast.success('Question added to vault!');
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add question to vault';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#eceef5] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3525cd]/10 text-[#3525cd]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e]">Add Question to Bank</h2>
              <p className="text-xs text-[#696778]">Insert a master question into the platform repository</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777586] transition hover:bg-[#f7f7fb] hover:text-[#191c1e]"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          {formError ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          ) : null}

          <div className="space-y-4">
            {/* Category & Subject Dropdowns */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubjectId('');
                  }}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="">-- Select Category --</option>
                  {taxonomy.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!categoryId || availableSubjects.length === 0}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white disabled:opacity-50"
                >
                  <option value="">-- Select Subject (Optional) --</option>
                  {availableSubjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name} ({subj.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Type the full question prompt here..."
                required
                className="mt-1.5 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] p-3 text-sm text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#3525cd] focus:bg-white focus:ring-4 focus:ring-[#3525cd]/10"
              />
            </div>

            {/* Options A, B, C, D */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                Answer Options <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-bold text-[#3525cd]">Option A</span>
                  <input
                    type="text"
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="Choice A"
                    required
                    className="mt-1 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-[#3525cd]">Option B</span>
                  <input
                    type="text"
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="Choice B"
                    required
                    className="mt-1 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-[#3525cd]">Option C</span>
                  <input
                    type="text"
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    placeholder="Choice C"
                    required
                    className="mt-1 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-[#3525cd]">Option D</span>
                  <input
                    type="text"
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    placeholder="Choice D"
                    required
                    className="mt-1 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Correct Option & Difficulty */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Correct Option <span className="text-red-500">*</span>
                </label>
                <select
                  value={correctOption}
                  onChange={(e) => setCorrectOption(e.target.value as CorrectOption)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>

            {/* Tags (Comma Separated) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                Tags (Comma-Separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. anatomy, cardiology, step1, high-yield"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#3525cd] focus:bg-white"
              />
              <p className="mt-1 text-[11px] text-[#777586]">
                Separate multiple tag keywords with commas.
              </p>
            </div>

            {/* Explanation (Optional) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                Explanation (Optional)
              </label>
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Provide rationale or reference notes for the correct choice..."
                className="mt-1.5 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] p-3 text-sm text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#3525cd] focus:bg-white"
              />
            </div>
          </div>

          {/* Modal Footer / Actions */}
          <div className="mt-8 flex items-center justify-end gap-3 border-t border-[#eceef5] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-[#dadce5] bg-white px-5 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-6 text-sm font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add to Bank'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
