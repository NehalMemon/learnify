'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Pencil, Trash2, CheckCircle2, Loader2, X, Save } from 'lucide-react';
import {
  updateBankQuestion,
  type BankQuestion,
  type BankQuestionType,
  type QuestionDifficulty,
} from '@/app/actions/questionBankActions';

interface QuestionVaultCardProps {
  question: BankQuestion;
  onUpdate: () => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

function getRelationName(relation?: { name?: string | null } | { name?: string | null }[] | null): string {
  if (!relation) return '';
  if (Array.isArray(relation)) return relation[0]?.name || '';
  return relation.name || '';
}

export function QuestionVaultCard({ question, onUpdate, onDelete }: QuestionVaultCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [type, setType] = useState<BankQuestionType>(question.type || 'SINGLE_CHOICE');
  const [questionText, setQuestionText] = useState(question.question_text || '');
  const [points, setPoints] = useState(question.points || 1);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(question.difficulty || 'MEDIUM');
  const [explanation, setExplanation] = useState(question.explanation || '');

  // Extract initial option texts from content.options array or fallback fields
  const optionsList = Array.isArray(question.content?.options) ? question.content.options : [];
  const [optionA, setOptionA] = useState(
    optionsList.find((o: { id: string; text: string }) => o.id === 'A')?.text || question.option_a || ''
  );
  const [optionB, setOptionB] = useState(
    optionsList.find((o: { id: string; text: string }) => o.id === 'B')?.text || question.option_b || ''
  );
  const [optionC, setOptionC] = useState(
    optionsList.find((o: { id: string; text: string }) => o.id === 'C')?.text || question.option_c || ''
  );
  const [optionD, setOptionD] = useState(
    optionsList.find((o: { id: string; text: string }) => o.id === 'D')?.text || question.option_d || ''
  );

  // Correct answer states
  const singleAns = question.correct_answer?.value || question.correct_option || 'A';
  const [correctOption, setCorrectOption] = useState<string>(String(singleAns).toUpperCase());

  const multiAns = Array.isArray(question.correct_answer?.values) ? question.correct_answer.values : ['A'];
  const [multiCorrectOptions, setMultiCorrectOptions] = useState<string[]>(multiAns);

  const [trueFalseAnswer, setTrueFalseAnswer] = useState<'TRUE' | 'FALSE'>(
    String(question.correct_answer?.value || 'TRUE').toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE'
  );

  const [shortAnswerText, setShortAnswerText] = useState<string>(
    String(question.correct_answer?.value || '')
  );

  const handleStartEdit = () => {
    // Reset to current question values
    setType(question.type || 'SINGLE_CHOICE');
    setQuestionText(question.question_text || '');
    setPoints(question.points || 1);
    setDifficulty(question.difficulty || 'MEDIUM');
    setExplanation(question.explanation || '');

    const opts = Array.isArray(question.content?.options) ? question.content.options : [];
    setOptionA(opts.find((o: { id: string; text: string }) => o.id === 'A')?.text || question.option_a || '');
    setOptionB(opts.find((o: { id: string; text: string }) => o.id === 'B')?.text || question.option_b || '');
    setOptionC(opts.find((o: { id: string; text: string }) => o.id === 'C')?.text || question.option_c || '');
    setOptionD(opts.find((o: { id: string; text: string }) => o.id === 'D')?.text || question.option_d || '');

    const sAns = question.correct_answer?.value || question.correct_option || 'A';
    setCorrectOption(String(sAns).toUpperCase());
    setMultiCorrectOptions(Array.isArray(question.correct_answer?.values) ? question.correct_answer.values : ['A']);
    setTrueFalseAnswer(String(question.correct_answer?.value || 'TRUE').toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE');
    setShortAnswerText(String(question.correct_answer?.value || ''));

    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const toggleMultiCorrect = (optionLetter: string) => {
    if (multiCorrectOptions.includes(optionLetter)) {
      if (multiCorrectOptions.length <= 1) {
        toast.error('Multiple choice requires at least 1 correct option.');
        return;
      }
      setMultiCorrectOptions((prev) => prev.filter((o) => o !== optionLetter));
    } else {
      setMultiCorrectOptions((prev) => [...prev, optionLetter]);
    }
  };

  const handleSaveChanges = async () => {
    if (!questionText.trim()) {
      toast.error('Question text is required.');
      return;
    }

    if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
      if (!optionA.trim() || !optionB.trim()) {
        toast.error('Please enter at least Option A and Option B.');
        return;
      }
    }

    if (type === 'SHORT_ANSWER' && !shortAnswerText.trim()) {
      toast.error('Accepted short answer text is required.');
      return;
    }

    let contentData: Record<string, unknown> = {};
    let correctAnswerData: Record<string, unknown> = {};

    if (type === 'SINGLE_CHOICE') {
      contentData = {
        options: [
          { id: 'A', text: optionA.trim() },
          { id: 'B', text: optionB.trim() },
          { id: 'C', text: optionC.trim() },
          { id: 'D', text: optionD.trim() },
        ].filter((o) => o.text.length > 0),
      };
      correctAnswerData = { value: correctOption };
    } else if (type === 'MULTIPLE_CHOICE') {
      contentData = {
        options: [
          { id: 'A', text: optionA.trim() },
          { id: 'B', text: optionB.trim() },
          { id: 'C', text: optionC.trim() },
          { id: 'D', text: optionD.trim() },
        ].filter((o) => o.text.length > 0),
      };
      correctAnswerData = { values: multiCorrectOptions };
    } else if (type === 'TRUE_FALSE') {
      contentData = { choices: ['TRUE', 'FALSE'] };
      correctAnswerData = { value: trueFalseAnswer };
    } else if (type === 'SHORT_ANSWER') {
      contentData = { placeholder: 'Type your answer...' };
      correctAnswerData = { value: shortAnswerText.trim() };
    }

    setIsSaving(true);
    try {
      await updateBankQuestion(question.id, {
        type,
        question_text: questionText.trim(),
        points: Number(points) || 1,
        difficulty,
        explanation: explanation.trim() || null,
        content: contentData,
        correct_answer: correctAnswerData,
      });

      toast.success('Question updated successfully!');
      setIsEditing(false);
      await onUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update question';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(question.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDifficultyBadge = (diff: QuestionDifficulty) => {
    switch (diff) {
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

  const getTypeBadge = (qType: BankQuestionType) => {
    switch (qType) {
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
            {qType}
          </span>
        );
    }
  };

  const subjName = getRelationName(question.subject);

  // -------------------------------------------------------------
  // COLLAPSED VIEW (DEFAULT STATE)
  // -------------------------------------------------------------
  if (!isEditing) {
    return (
      <div className="rounded-2xl border border-[#e4e6ef] bg-white p-5 shadow-xs transition hover:border-[#cfd1dc] hover:shadow-md">
        {/* Header Row: Badges Left, Action Buttons Right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {getTypeBadge(question.type)}
            {getDifficultyBadge(question.difficulty)}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              {question.points || 1} pt{question.points === 1 ? '' : 's'}
            </span>
            {subjName ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                {subjName}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dadce5] bg-white px-2.5 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] hover:text-[#3525cd]"
              title="Edit Question"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              title="Delete Question"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Question Text Prompt */}
        <h3 className="mt-3 text-sm font-bold leading-relaxed text-[#191c1e]">
          {question.question_text}
        </h3>
      </div>
    );
  }

  // -------------------------------------------------------------
  // EXPANDED VIEW (EDIT MODE)
  // -------------------------------------------------------------
  return (
    <div className="rounded-2xl border-2 border-[#3525cd] bg-white p-6 shadow-md transition">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceef5] pb-4">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[#3525cd]">
          Editing Question Item
        </span>

        <div className="flex flex-wrap items-center gap-3">
          {/* Question Type Select */}
          <div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BankQuestionType)}
              className="min-h-9 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
            >
              <option value="SINGLE_CHOICE">Single Choice</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="SHORT_ANSWER">Short Answer</option>
            </select>
          </div>

          {/* Difficulty Dropdown */}
          <div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
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
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="min-h-9 w-16 rounded-xl border border-[#dadce5] bg-[#f7f7fb] text-center text-xs font-bold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
            />
            <span className="text-xs text-[#777586] font-medium">pts</span>
          </div>
        </div>
      </div>

      {/* Question Textarea */}
      <div className="mt-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-1.5">
          Question Text <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter question prompt or stem..."
          className="w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] p-3 text-sm text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
        />
      </div>

      {/* Conditional Type Forms */}
      <div className="mt-4 rounded-xl border border-[#eceef5] bg-[#fcfcfd] p-4">
        {type === 'SINGLE_CHOICE' ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-3">
              Options & Correct Choice (Single Choice)
            </p>
            <div className="space-y-3">
              {[
                { letter: 'A', val: optionA, setter: setOptionA },
                { letter: 'B', val: optionB, setter: setOptionB },
                { letter: 'C', val: optionC, setter: setOptionC },
                { letter: 'D', val: optionD, setter: setOptionD },
              ].map(({ letter, val, setter }) => {
                const isSelected = correctOption === letter;
                return (
                  <div key={letter} className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`edit-single-correct-${question.id}`}
                        checked={isSelected}
                        onChange={() => setCorrectOption(letter)}
                        className="h-4 w-4 text-[#3525cd] focus:ring-[#3525cd]"
                      />
                      <span className="text-xs font-bold text-[#3525cd]">{letter}</span>
                    </label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={`Option ${letter} text...`}
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
        ) : type === 'MULTIPLE_CHOICE' ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-3">
              Options & Correct Choices (Multiple Choice - Check all correct)
            </p>
            <div className="space-y-3">
              {[
                { letter: 'A', val: optionA, setter: setOptionA },
                { letter: 'B', val: optionB, setter: setOptionB },
                { letter: 'C', val: optionC, setter: setOptionC },
                { letter: 'D', val: optionD, setter: setOptionD },
              ].map(({ letter, val, setter }) => {
                const isSelected = multiCorrectOptions.includes(letter);
                return (
                  <div key={letter} className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMultiCorrect(letter)}
                        className="h-4 w-4 rounded border-gray-300 text-[#3525cd] focus:ring-[#3525cd]"
                      />
                      <span className="text-xs font-bold text-[#3525cd]">{letter}</span>
                    </label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={`Option ${letter} text...`}
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
        ) : type === 'TRUE_FALSE' ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-3">
              Correct Statement Answer
            </p>
            <div className="flex items-center gap-4">
              {['TRUE', 'FALSE'].map((tfVal) => (
                <label
                  key={tfVal}
                  className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition ${
                    trueFalseAnswer === tfVal
                      ? 'border-[#3525cd] bg-[#f1f0ff] text-[#3525cd]'
                      : 'border-[#dadce5] bg-white text-[#4b4a58] hover:bg-[#f7f7fb]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`edit-tf-${question.id}`}
                    value={tfVal}
                    checked={trueFalseAnswer === tfVal}
                    onChange={() => setTrueFalseAnswer(tfVal as 'TRUE' | 'FALSE')}
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
              value={shortAnswerText}
              onChange={(e) => setShortAnswerText(e.target.value)}
              placeholder="Exact accepted answer string..."
              className="min-h-10 w-full rounded-xl border border-[#dadce5] bg-white px-3 text-xs font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd]"
            />
          </div>
        )}
      </div>

      {/* Explanation Field */}
      <div className="mt-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#696778] mb-1">
          Explanation / Rationale
        </label>
        <input
          type="text"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Optional answer explanation..."
          className="min-h-10 w-full rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3 text-xs text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white"
        />
      </div>

      {/* Action Buttons: Cancel and Save Changes */}
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#eceef5] pt-4">
        <button
          type="button"
          onClick={handleCancelEdit}
          disabled={isSaving}
          className="rounded-xl border border-[#dadce5] bg-white px-4 py-2 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3525cd] px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2f20b8] disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
