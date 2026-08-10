'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Database,
  HelpCircle,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  bulkCreateBankQuestions,
  createBankQuestionsBatch,
  type BankQuestionType,
  type CreateBankQuestionInput,
  type QuestionDifficulty,
} from '@/app/actions/questionBankActions';
import {
  getCategoriesWithSubjects,
  type QuizCategoryWithSubjects,
} from '@/app/actions/taxonomyActions';

interface QuestionDraftItem {
  id: string;
  type: BankQuestionType;
  question_text: string;
  points: number;
  difficulty: QuestionDifficulty;
  explanation: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  multiCorrectOptions: string[];
  trueFalseAnswer: 'TRUE' | 'FALSE';
  shortAnswerText: string;
}

const createEmptyQuestion = (defaultDifficulty: QuestionDifficulty = 'MEDIUM'): QuestionDraftItem => ({
  id: crypto.randomUUID(),
  type: 'SINGLE_CHOICE',
  question_text: '',
  points: 1,
  difficulty: defaultDifficulty,
  explanation: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 'A',
  multiCorrectOptions: ['A'],
  trueFalseAnswer: 'TRUE',
  shortAnswerText: '',
});

function MassEntryBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get('categoryId') || '';
  const initialSubjectId = searchParams.get('subjectId') || null;

  const [taxonomy, setTaxonomy] = useState<QuizCategoryWithSubjects[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId);
  const [globalDifficulty, setGlobalDifficulty] = useState<QuestionDifficulty>('MEDIUM');
  const [questions, setQuestions] = useState<QuestionDraftItem[]>([
    createEmptyQuestion('MEDIUM'),
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getCategoriesWithSubjects()
      .then((data) => setTaxonomy(data))
      .catch((err) => console.error('Failed to load taxonomy:', err));
  }, []);

  const availableSubjects = useMemo(() => {
    if (!categoryId) return [];
    const cat = taxonomy.find((c) => c.id === categoryId);
    return cat ? cat.subjects : [];
  }, [taxonomy, categoryId]);

  const categoryName = useMemo(() => {
    if (!categoryId) return 'Uncategorized';
    const cat = taxonomy.find((c) => c.id === categoryId);
    return cat ? cat.name : 'Selected Category';
  }, [taxonomy, categoryId]);

  const subjectName = useMemo(() => {
    if (!selectedSubjectId) return null;
    const subj = availableSubjects.find((s) => s.id === selectedSubjectId);
    return subj ? subj.name : 'Selected Subject';
  }, [availableSubjects, selectedSubjectId]);

  const handleGlobalDifficultyChange = (newDiff: QuestionDifficulty) => {
    setGlobalDifficulty(newDiff);
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        difficulty: newDiff,
      }))
    );
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion(globalDifficulty)]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error('You must keep at least one question card.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (
    index: number,
    field: keyof QuestionDraftItem,
    value: any
  ) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleMultiCorrect = (index: number, optionId: string) => {
    const question = questions[index];
    if (!question) return;

    const current = question.multiCorrectOptions || [];

    if (current.includes(optionId)) {
      if (current.length <= 1) {
        toast.error('Multiple Choice requires at least 1 correct answer.');
        return;
      }
      const nextOptions = current.filter((id) => id !== optionId);
      setQuestions((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], multiCorrectOptions: nextOptions };
        }
        return updated;
      });
    } else {
      const nextOptions = [...current, optionId];
      setQuestions((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], multiCorrectOptions: nextOptions };
        }
        return updated;
      });
    }
  };

  const handleSaveToVault = async () => {
    console.log('CLIENT: handleSaveToVault triggered with categoryId:', categoryId, 'selectedSubjectId:', selectedSubjectId);

    if (!selectedSubjectId) {
      toast.error('Please select a Subject before saving questions to the vault.');
      return;
    }

    // 1. Filter out empty 'ghost' rows (where question_text is blank)
    const validQuestions = questions.filter(
      (q) => q.question_text && q.question_text.trim().length > 0
    );

    if (validQuestions.length === 0) {
      toast.error('Please enter at least one question prompt before saving.');
      return;
    }

    // 2. Validate options on non-empty rows
    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];
      if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
        if (!q.optionA.trim() || !q.optionB.trim()) {
          toast.error(`Question #${i + 1} must have at least Option A and Option B.`);
          return;
        }
      }

      if (q.type === 'SHORT_ANSWER' && !q.shortAnswerText.trim()) {
        toast.error(`Question #${i + 1} requires an accepted answer string.`);
        return;
      }
    }

    setIsSaving(true);

    try {
      const payloadItems: CreateBankQuestionInput[] = validQuestions.map((q) => {
        let content: Record<string, any> = {};
        let correct_answer: Record<string, any> = {};

        if (q.type === 'SINGLE_CHOICE') {
          content = {
            options: [
              { id: 'A', text: q.optionA.trim() },
              { id: 'B', text: q.optionB.trim() },
              { id: 'C', text: q.optionC.trim() },
              { id: 'D', text: q.optionD.trim() },
            ].filter((o) => o.text.length > 0),
          };
          correct_answer = { value: q.correctOption };
        } else if (q.type === 'MULTIPLE_CHOICE') {
          content = {
            options: [
              { id: 'A', text: q.optionA.trim() },
              { id: 'B', text: q.optionB.trim() },
              { id: 'C', text: q.optionC.trim() },
              { id: 'D', text: q.optionD.trim() },
            ].filter((o) => o.text.length > 0),
          };
          correct_answer = { values: q.multiCorrectOptions };
        } else if (q.type === 'TRUE_FALSE') {
          content = { choices: ['TRUE', 'FALSE'] };
          correct_answer = { value: q.trueFalseAnswer };
        } else if (q.type === 'SHORT_ANSWER') {
          content = { placeholder: 'Type your answer...' };
          correct_answer = { value: q.shortAnswerText.trim() };
        }

        return {
          category_id: categoryId || null,
          subject_id: selectedSubjectId,
          type: q.type,
          question_text: q.question_text.trim(),
          points: Number(q.points) || 1,
          explanation: q.explanation ? q.explanation.trim() : null,
          difficulty: q.difficulty,
          tags: [],
          content,
          correct_answer,
        };
      });

      console.log('CLIENT: Invoking bulkCreateBankQuestions with items count:', payloadItems.length);

      const res = await bulkCreateBankQuestions(payloadItems, categoryId, selectedSubjectId);

      if (!res.success) {
        toast.error('Failed to save questions to vault.');
        return;
      }

      toast.success(`Successfully added ${res.count} question(s) to the vault!`);
      setTimeout(() => router.push('/admin/question-bank'), 800);
    } catch (err: unknown) {
      console.error('CLIENT ERROR in handleSaveToVault:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save questions to vault.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans text-[#191c1e] antialiased pb-24">
      {/* Sticky Top Header / Settings Bar */}
      <div className="sticky top-0 z-30 border-b border-[#e4e6ef] bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full max-w-6xl px-6 py-4">
          {/* Header Left: Navigation & Title */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/admin/question-bank"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dadce5] text-[#4b4a58] transition hover:bg-[#f7f7fb]"
              title="Back to Vault"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-[#191c1e]">Mass Question Builder</h1>
                <span className="rounded-full bg-[#f1f0ff] px-2.5 py-0.5 text-xs font-bold text-[#3525cd]">
                  {categoryName}
                </span>
                {subjectName ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {subjectName}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[#696778]">
                {questions.length} question card{questions.length === 1 ? '' : 's'} in current batch
              </p>
            </div>
          </div>

          {/* Header Right: Controls & Save Button */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between xl:justify-end gap-4 w-full xl:w-auto">
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
              {/* Global Subject Select Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#696778] shrink-0">
                  Subject <span className="text-red-500">*</span>:
                </label>
                <select
                  value={selectedSubjectId || ''}
                  onChange={(e) => setSelectedSubjectId(e.target.value || null)}
                  className="min-h-9 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs font-bold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="">-- Select Subject --</option>
                  {availableSubjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Global Default Difficulty Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#696778] shrink-0">
                  Default Difficulty:
                </label>
                <select
                  value={globalDifficulty}
                  onChange={(e) => handleGlobalDifficultyChange(e.target.value as QuestionDifficulty)}
                  className="min-h-9 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs font-bold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>

            {/* Main Save to Vault Button */}
            <button
              type="button"
              onClick={handleSaveToVault}
              disabled={isSaving || !selectedSubjectId}
              title={!selectedSubjectId ? 'Please select a Subject before saving' : 'Save questions to vault'}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-5 text-sm font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save to Vault
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Canvas */}
      <div className="mx-auto max-w-4xl px-6 pt-8 space-y-6">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-2xl border border-[#e4e6ef] bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            {/* Card Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceef5] pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f1f0ff] text-xs font-extrabold text-[#3525cd]">
                  #{idx + 1}
                </span>
                <span className="text-sm font-bold text-[#191c1e]">Question Item</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Question Type Select */}
                <div>
                  <select
                    value={q.type}
                    onChange={(e) => handleQuestionChange(idx, 'type', e.target.value as BankQuestionType)}
                    className="min-h-9 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                  >
                    <option value="SINGLE_CHOICE">Single Choice</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                  </select>
                </div>

                {/* Question Difficulty Override */}
                <div>
                  <select
                    value={q.difficulty}
                    onChange={(e) => handleQuestionChange(idx, 'difficulty', e.target.value as QuestionDifficulty)}
                    className="min-h-9 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs font-bold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                {/* Points Input */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={q.points}
                    onChange={(e) => handleQuestionChange(idx, 'points', Number(e.target.value))}
                    className="min-h-9 w-16 rounded-xl border border-[#dadce5] bg-[#f7f7fb] text-center text-xs font-bold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
                  />
                  <span className="text-xs text-[#777586] font-medium">pts</span>
                </div>

                {/* Remove Card Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(idx)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50"
                  title="Remove question card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Question Textarea */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-1.5">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={q.question_text}
                onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                placeholder="Enter clinical prompt or question stem..."
                className="w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] p-3 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
              />
            </div>

            {/* Conditional Type Forms */}
            <div className="mt-4 rounded-xl border border-[#eceef5] bg-[#fcfcfd] p-4">
              {q.type === 'SINGLE_CHOICE' ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-3">
                    Options & Correct Choice (Single Choice)
                  </p>
                  <div className="space-y-3">
                    {[
                      { key: 'optionA', label: 'Option A' },
                      { key: 'optionB', label: 'Option B' },
                      { key: 'optionC', label: 'Option C' },
                      { key: 'optionD', label: 'Option D' },
                    ].map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = q.correctOption === letter;
                      return (
                        <div key={opt.key} className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`single-correct-${q.id}`}
                              checked={isSelected}
                              onChange={() => handleQuestionChange(idx, 'correctOption', letter)}
                              className="h-4 w-4 text-[#3525cd] focus:ring-[#3525cd]"
                            />
                            <span className="text-xs font-bold text-[#3525cd]">{letter}</span>
                          </label>
                          <input
                            type="text"
                            value={(q as any)[opt.key]}
                            onChange={(e) => handleQuestionChange(idx, opt.key as any, e.target.value)}
                            placeholder={`${opt.label} text...`}
                            className={`min-h-10 w-full rounded-xl border px-3 text-xs text-[#191c1e] outline-none transition ${
                              isSelected
                                ? 'border-emerald-400 bg-emerald-50/50 font-semibold'
                                : 'border-[#dadce5] bg-white focus:border-[#3525cd]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : q.type === 'MULTIPLE_CHOICE' ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-3">
                    Options & Correct Choices (Multiple Choice - Check all correct)
                  </p>
                  <div className="space-y-3">
                    {[
                      { key: 'optionA', label: 'Option A' },
                      { key: 'optionB', label: 'Option B' },
                      { key: 'optionC', label: 'Option C' },
                      { key: 'optionD', label: 'Option D' },
                    ].map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = q.multiCorrectOptions.includes(letter);
                      return (
                        <div key={opt.key} className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMultiCorrect(idx, letter)}
                              className="h-4 w-4 rounded border-gray-300 text-[#3525cd] focus:ring-[#3525cd]"
                            />
                            <span className="text-xs font-bold text-[#3525cd]">{letter}</span>
                          </label>
                          <input
                            type="text"
                            value={(q as any)[opt.key]}
                            onChange={(e) => handleQuestionChange(idx, opt.key as any, e.target.value)}
                            placeholder={`${opt.label} text...`}
                            className={`min-h-10 w-full rounded-xl border px-3 text-xs text-[#191c1e] outline-none transition ${
                              isSelected
                                ? 'border-purple-400 bg-purple-50/50 font-semibold'
                                : 'border-[#dadce5] bg-white focus:border-[#3525cd]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : q.type === 'TRUE_FALSE' ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-3">
                    Correct Statement Answer
                  </p>
                  <div className="flex items-center gap-4">
                    {['TRUE', 'FALSE'].map((tfVal) => (
                      <label
                        key={tfVal}
                        className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition ${
                          q.trueFalseAnswer === tfVal
                            ? 'border-[#3525cd] bg-[#f1f0ff] text-[#3525cd]'
                            : 'border-[#dadce5] bg-white text-[#4b4a58] hover:bg-[#f7f7fb]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`tf-answer-${q.id}`}
                          value={tfVal}
                          checked={q.trueFalseAnswer === tfVal}
                          onChange={() => handleQuestionChange(idx, 'trueFalseAnswer', tfVal)}
                          className="h-4 w-4 text-[#3525cd]"
                        />
                        <span>{tfVal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-1.5">
                    Accepted Short Answer String <span className="text-red-500">*</span>
                  </p>
                  <input
                    type="text"
                    value={q.shortAnswerText}
                    onChange={(e) => handleQuestionChange(idx, 'shortAnswerText', e.target.value)}
                    placeholder="Exact accepted answer string (e.g. Myocardial Infarction)..."
                    className="min-h-10 w-full rounded-xl border border-[#dadce5] bg-white px-3 text-xs font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd]"
                  />
                </div>
              )}
            </div>

            {/* Footer Details: Explanation */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#696778] mb-1">
                Explanation / Rationale
              </label>
              <input
                type="text"
                value={q.explanation}
                onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                placeholder="Optional answer explanation..."
                className="min-h-10 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
              />
            </div>
          </div>
        ))}

        {/* Bottom Action Bar */}
        <div className="pt-2 flex justify-center w-full">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="inline-flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#3525cd]/40 bg-[#f1f0ff]/50 px-6 text-sm font-bold text-[#3525cd] transition hover:border-[#3525cd] hover:bg-[#f1f0ff] shadow-2xs"
          >
            <Plus className="h-5 w-5" />
            + Add Another Question
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MassEntryBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#3525cd]" />
        </div>
      }
    >
      <MassEntryBuilderContent />
    </Suspense>
  );
}
