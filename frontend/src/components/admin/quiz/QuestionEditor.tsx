'use client';

import React from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { Target, Plus, Trash2, HelpCircle, AlertCircle } from 'lucide-react';
import { QuizBuilderFormValues } from '@/lib/validations/quiz';

interface QuestionEditorProps {
  register: UseFormRegister<QuizBuilderFormValues>;
  watch: UseFormWatch<QuizBuilderFormValues>;
  setValue: UseFormSetValue<QuizBuilderFormValues>;
  errors: FieldErrors<QuizBuilderFormValues>;
  activeIndex: number | null;
}

export function QuestionEditor({
  register,
  watch,
  setValue,
  errors,
  activeIndex,
}: QuestionEditorProps) {
  // Render empty state if no question is active
  if (activeIndex === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 text-center h-full select-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 border border-purple-200 mb-4 animate-bounce duration-1000">
          <Target className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">No Question Selected</h3>
        <p className="text-sm text-gray-500 max-w-sm mt-1">
          Select a question from the left sidebar to edit, or add a new one to get started.
        </p>
      </div>
    );
  }

  // Get active question fields
  const questionType = watch(`questions.${activeIndex}.type`);
  const questionText = watch(`questions.${activeIndex}.questionText`);
  
  // Watch options or pairs dynamically to update UI on add/remove
  const options = watch(`questions.${activeIndex}.options`) || [];
  const correctOptionIndex = watch(`questions.${activeIndex}.correctOptionIndex`);
  const correctOptionIndices = watch(`questions.${activeIndex}.correctOptionIndices`) || [];
  const correctAnswer = watch(`questions.${activeIndex}.correctAnswer`);
  const pairs = watch(`questions.${activeIndex}.pairs`) || [];

  interface QuestionErrors {
    questionText?: { message?: string };
    options?: { message?: string };
    correctOptionIndex?: { message?: string };
    correctOptionIndices?: { message?: string };
    correctAnswer?: { message?: string };
    pairs?: { message?: string };
  }

  // Errors for the active question (cast via unknown to avoid TS union key check)
  const questionErrors = errors.questions?.[activeIndex] as unknown as QuestionErrors | undefined;

  // Helper to add an option
  const addOption = () => {
    setValue(`questions.${activeIndex}.options`, [...options, '']);
  };

  // Helper to remove an option
  const removeOption = (indexToRemove: number) => {
    if (options.length <= 2) return; // Keep at least 2 options
    const newOptions = options.filter((_, idx) => idx !== indexToRemove);
    setValue(`questions.${activeIndex}.options`, newOptions);

    // Adjust single choice correction if needed
    if (questionType === 'SINGLE_CHOICE') {
      if (correctOptionIndex === indexToRemove) {
        setValue(`questions.${activeIndex}.correctOptionIndex`, 0);
      } else if (correctOptionIndex > indexToRemove) {
        setValue(`questions.${activeIndex}.correctOptionIndex`, correctOptionIndex - 1);
      }
    }

    // Adjust multiple select corrections if needed
    if (questionType === 'MULTIPLE_SELECT') {
      const newIndices = correctOptionIndices
        .filter((idx) => idx !== indexToRemove)
        .map((idx) => (idx > indexToRemove ? idx - 1 : idx));
      setValue(
        `questions.${activeIndex}.correctOptionIndices`,
        newIndices.length > 0 ? newIndices : [0]
      );
    }
  };

  // Helper to add a pair
  const addPair = () => {
    setValue(`questions.${activeIndex}.pairs`, [...pairs, { left: '', right: '' }]);
  };

  // Helper to remove a pair
  const removePair = (indexToRemove: number) => {
    if (pairs.length <= 2) return; // Keep at least 2 pairs
    setValue(
      `questions.${activeIndex}.pairs`,
      pairs.filter((_, idx) => idx !== indexToRemove)
    );
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
      {/* Editor Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
        <div>
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-widest block mb-0.5">
            Editing Question
          </span>
          <h2 className="text-base font-bold text-gray-800">
            Question #{activeIndex + 1}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {questionType.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Question Text */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            Question Prompt
            <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register(`questions.${activeIndex}.questionText`)}
            placeholder="Type the question content here..."
            rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-sm resize-none"
          />
          {questionErrors?.questionText && (
            <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {questionErrors.questionText.message}
            </p>
          )}
        </div>

        {/* Dynamic Fields Based on Type */}

        {/* 1. SINGLE_CHOICE */}
        {questionType === 'SINGLE_CHOICE' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                Answer Options
                <span className="text-xs font-normal text-gray-400">(Select one correct option)</span>
              </label>
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Option
              </button>
            </div>

            <div className="space-y-3">
              {options.map((_, optIdx) => (
                <div key={optIdx} className="flex items-center gap-3">
                  {/* Correct radio indicator */}
                  <input
                    type="radio"
                    name={`questions.${activeIndex}.correctOption`}
                    checked={correctOptionIndex === optIdx}
                    onChange={() => setValue(`questions.${activeIndex}.correctOptionIndex`, optIdx)}
                    className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500 cursor-pointer"
                  />
                  {/* Option Text Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      {...register(`questions.${activeIndex}.options.${optIdx}`)}
                      placeholder={`Option ${optIdx + 1}`}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeOption(optIdx)}
                    disabled={options.length <= 2}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {questionErrors?.options && (
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {questionErrors.options.message}
              </p>
            )}
          </div>
        )}

        {/* 2. MULTIPLE_SELECT */}
        {questionType === 'MULTIPLE_SELECT' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                Answer Options
                <span className="text-xs font-normal text-gray-400">(Select all that apply)</span>
              </label>
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Option
              </button>
            </div>

            <div className="space-y-3">
              {options.map((_, optIdx) => {
                const isChecked = correctOptionIndices.includes(optIdx);
                const handleCheckboxChange = () => {
                  if (isChecked) {
                    // Remove index, keeping at least 1 correct option
                    if (correctOptionIndices.length > 1) {
                      setValue(
                        `questions.${activeIndex}.correctOptionIndices`,
                        correctOptionIndices.filter((idx) => idx !== optIdx)
                      );
                    }
                  } else {
                    setValue(
                      `questions.${activeIndex}.correctOptionIndices`,
                      [...correctOptionIndices, optIdx]
                    );
                  }
                };

                return (
                  <div key={optIdx} className="flex items-center gap-3">
                    {/* Correct checkbox indicator */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    {/* Option Text Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        {...register(`questions.${activeIndex}.options.${optIdx}`)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeOption(optIdx)}
                      disabled={options.length <= 2}
                      className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            {questionErrors?.options && (
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {questionErrors.options.message}
              </p>
            )}
            {questionErrors?.correctOptionIndices && (
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {questionErrors.correctOptionIndices.message}
              </p>
            )}
          </div>
        )}

        {/* 3. TRUE_FALSE */}
        {questionType === 'TRUE_FALSE' && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              Correct Answer
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue(`questions.${activeIndex}.correctAnswer`, 'true')}
                className={`flex items-center justify-center p-4 rounded-xl border-2 font-semibold transition-all ${
                  correctAnswer === 'true'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-100'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                True
              </button>
              <button
                type="button"
                onClick={() => setValue(`questions.${activeIndex}.correctAnswer`, 'false')}
                className={`flex items-center justify-center p-4 rounded-xl border-2 font-semibold transition-all ${
                  correctAnswer === 'false'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-100'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                False
              </button>
            </div>
            {questionErrors?.correctAnswer && (
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {questionErrors.correctAnswer.message}
              </p>
            )}
          </div>
        )}

        {/* 4. MATCHING_PAIRS */}
        {questionType === 'MATCHING_PAIRS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                Matching Pairs
                <span className="text-xs font-normal text-gray-400">(Item A maps exactly to Item B)</span>
              </label>
              <button
                type="button"
                onClick={addPair}
                className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Pair
              </button>
            </div>

            <div className="space-y-3">
              {pairs.map((_, pairIdx) => (
                <div key={pairIdx} className="flex items-center gap-3">
                  {/* Left Item */}
                  <div className="flex-1">
                    <input
                      type="text"
                      {...register(`questions.${activeIndex}.pairs.${pairIdx}.left`)}
                      placeholder={`Left Item ${pairIdx + 1}`}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  <span className="text-gray-400 font-semibold text-sm">→</span>

                  {/* Right Match */}
                  <div className="flex-1">
                    <input
                      type="text"
                      {...register(`questions.${activeIndex}.pairs.${pairIdx}.right`)}
                      placeholder={`Right Match ${pairIdx + 1}`}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  {/* Remove pair */}
                  <button
                    type="button"
                    onClick={() => removePair(pairIdx)}
                    disabled={pairs.length <= 2}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {questionErrors?.pairs && (
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {questionErrors.pairs.message}
              </p>
            )}
          </div>
        )}

        {/* Explanation / Solution Details */}
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            Explanation / Solution Details
            <span className="text-xs font-normal text-gray-400">(Optional)</span>
          </label>
          <textarea
            {...register(`questions.${activeIndex}.explanation`)}
            placeholder="Provide a detailed explanation of the correct solution..."
            rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-sm resize-none"
          />
        </div>
      </div>
    </div>
  );
}
