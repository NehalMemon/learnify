'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, Database, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  createBankQuestion,
  type BankQuestionType,
  type QuestionDifficulty,
} from '@/app/actions/questionBankActions';
import type { QuizCategoryWithSubjects } from '@/app/actions/taxonomyActions';

interface OptionItem {
  id: string;
  text: string;
}

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
  // Global Fields
  const [categoryId, setCategoryId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [type, setType] = useState<BankQuestionType>('SINGLE_CHOICE');
  const [questionText, setQuestionText] = useState<string>('');
  const [points, setPoints] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('MEDIUM');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');

  // Single & Multiple Choice Dynamic Options
  const [options, setOptions] = useState<OptionItem[]>([
    { id: 'opt_1', text: '' },
    { id: 'opt_2', text: '' },
    { id: 'opt_3', text: '' },
    { id: 'opt_4', text: '' },
  ]);
  const [selectedSingleOption, setSelectedSingleOption] = useState<string>('opt_1');
  const [selectedMultipleOptions, setSelectedMultipleOptions] = useState<string[]>(['opt_1']);

  // True/False Choice
  const [tfAnswer, setTfAnswer] = useState<'true' | 'false'>('true');

  // Short Answer Text
  const [shortAnswerText, setShortAnswerText] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Available subjects based on selected category
  const availableSubjects = useMemo(() => {
    if (!categoryId) return [];
    const cat = taxonomy.find((c) => c.id === categoryId);
    return cat ? cat.subjects : [];
  }, [taxonomy, categoryId]);

  useEffect(() => {
    if (taxonomy.length > 0 && !categoryId) {
      setCategoryId(taxonomy[0].id);
    }
  }, [taxonomy, categoryId]);

  const resetForm = () => {
    setQuestionText('');
    setPoints(1);
    setDifficulty('MEDIUM');
    setTagsInput('');
    setExplanation('');
    setOptions([
      { id: 'opt_1', text: '' },
      { id: 'opt_2', text: '' },
      { id: 'opt_3', text: '' },
      { id: 'opt_4', text: '' },
    ]);
    setSelectedSingleOption('opt_1');
    setSelectedMultipleOptions(['opt_1']);
    setTfAnswer('true');
    setShortAnswerText('');
    setFormError(null);
  };

  const handleAddOption = () => {
    const nextNum = options.length + 1;
    const newId = `opt_${Date.now()}_${nextNum}`;
    setOptions((prev) => [...prev, { id: newId, text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      toast.error('At least 2 options are required.');
      return;
    }
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
    if (selectedSingleOption === id && options.length > 0) {
      const remaining = options.filter((opt) => opt.id !== id);
      if (remaining.length > 0) setSelectedSingleOption(remaining[0].id);
    }
    setSelectedMultipleOptions((prev) => prev.filter((optId) => optId !== id));
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, text } : opt))
    );
  };

  const toggleMultipleOption = (id: string) => {
    setSelectedMultipleOptions((prev) =>
      prev.includes(id) ? prev.filter((optId) => optId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!questionText.trim()) {
      setFormError('Question text is required.');
      return;
    }

    let contentData: Record<string, any> = {};
    let correctAnswerData: Record<string, any> = {};

    if (type === 'SINGLE_CHOICE') {
      const emptyOpt = options.find((opt) => !opt.text.trim());
      if (emptyOpt) {
        setFormError('Please fill in text for all choice options.');
        return;
      }
      if (!selectedSingleOption) {
        setFormError('Please select the correct answer choice.');
        return;
      }
      contentData = {
        options: options.map((opt) => ({ id: opt.id, text: opt.text.trim() })),
      };
      correctAnswerData = { value: selectedSingleOption };
    } else if (type === 'MULTIPLE_CHOICE') {
      const emptyOpt = options.find((opt) => !opt.text.trim());
      if (emptyOpt) {
        setFormError('Please fill in text for all choice options.');
        return;
      }
      if (selectedMultipleOptions.length === 0) {
        setFormError('Please select at least one correct answer choice.');
        return;
      }
      contentData = {
        options: options.map((opt) => ({ id: opt.id, text: opt.text.trim() })),
      };
      correctAnswerData = { values: selectedMultipleOptions };
    } else if (type === 'TRUE_FALSE') {
      contentData = {
        options: [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' },
        ],
      };
      correctAnswerData = { value: tfAnswer };
    } else if (type === 'SHORT_ANSWER') {
      if (!shortAnswerText.trim()) {
        setFormError('Please enter the accepted correct answer text.');
        return;
      }
      contentData = { placeholder: 'Type your answer here...' };
      correctAnswerData = { value: shortAnswerText.trim() };
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    setIsSubmitting(true);

    try {
      await createBankQuestion({
        category_id: categoryId || null,
        subject_id: subjectId || null,
        type,
        question_text: questionText.trim(),
        points: Number(points) || 1,
        difficulty,
        tags,
        explanation: explanation.trim() || null,
        content: contentData,
        correct_answer: correctAnswerData,
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
              <p className="text-xs text-[#696778]">Create a master question with dynamic type configuration</p>
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
            {/* Category & Subject Selectors */}
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

            {/* Question Type Selector & Points */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Question Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as BankQuestionType)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="SINGLE_CHOICE">Single Choice (Radio)</option>
                  <option value="MULTIPLE_CHOICE">Multiple Choice (Checkboxes)</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Points / Score Weight
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                />
              </div>
            </div>

            {/* Question Text Prompt */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                Question Prompt <span className="text-red-500">*</span>
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

            {/* ── Conditional Form Fields according to Question Type ────── */}

            {/* 1. SINGLE CHOICE */}
            {type === 'SINGLE_CHOICE' && (
              <div className="space-y-3 rounded-2xl border border-[#e4e6ef] bg-[#fbfbfd] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3525cd]">
                    Options (Select 1 correct answer)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#3525cd] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Option
                  </button>
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, index) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="single_choice_radio"
                        checked={selectedSingleOption === opt.id}
                        onChange={() => setSelectedSingleOption(opt.id)}
                        className="h-4 w-4 text-[#3525cd] focus:ring-[#3525cd]/20"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        required
                        className="min-h-10 flex-1 rounded-xl border border-[#dadce5] bg-white px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd]"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                          title="Remove option"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. MULTIPLE CHOICE */}
            {type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-3 rounded-2xl border border-[#e4e6ef] bg-[#fbfbfd] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3525cd]">
                    Options (Check all correct answers)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#3525cd] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Option
                  </button>
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, index) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedMultipleOptions.includes(opt.id)}
                        onChange={() => toggleMultipleOption(opt.id)}
                        className="h-4 w-4 rounded border-[#dadce5] text-[#3525cd] focus:ring-[#3525cd]/20"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        required
                        className="min-h-10 flex-1 rounded-xl border border-[#dadce5] bg-white px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd]"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                          title="Remove option"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. TRUE / FALSE */}
            {type === 'TRUE_FALSE' && (
              <div className="rounded-2xl border border-[#e4e6ef] bg-[#fbfbfd] p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3525cd]">
                  Select Correct Answer
                </label>
                <div className="mt-3 flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-sm font-bold text-[#191c1e] cursor-pointer">
                    <input
                      type="radio"
                      name="tf_radio"
                      value="true"
                      checked={tfAnswer === 'true'}
                      onChange={() => setTfAnswer('true')}
                      className="h-4 w-4 text-[#3525cd] focus:ring-[#3525cd]/20"
                    />
                    True
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-bold text-[#191c1e] cursor-pointer">
                    <input
                      type="radio"
                      name="tf_radio"
                      value="false"
                      checked={tfAnswer === 'false'}
                      onChange={() => setTfAnswer('false')}
                      className="h-4 w-4 text-[#3525cd] focus:ring-[#3525cd]/20"
                    />
                    False
                  </label>
                </div>
              </div>
            )}

            {/* 4. SHORT ANSWER */}
            {type === 'SHORT_ANSWER' && (
              <div className="rounded-2xl border border-[#e4e6ef] bg-[#fbfbfd] p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3525cd]">
                  Accepted Correct Answer Text <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shortAnswerText}
                  onChange={(e) => setShortAnswerText(e.target.value)}
                  placeholder="e.g. Mitochondria"
                  required
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#dadce5] bg-white px-3.5 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd]"
                />
                <p className="mt-1.5 text-[11px] text-[#696778]">
                  Student submission will be checked against this exact answer string.
                </p>
              </div>
            )}

            {/* Difficulty & Tags */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                  Tags (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. anatomy, step1, High-Yield"
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-sm text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#3525cd] focus:bg-white"
                />
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58]">
                Explanation (Optional)
              </label>
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Provide reasoning or reference notes for the correct answer..."
                className="mt-1.5 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] p-3 text-sm text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#3525cd] focus:bg-white"
              />
            </div>
          </div>

          {/* Form Actions */}
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
