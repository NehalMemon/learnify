'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  Brain,
  Sliders,
  FileText,
  CheckSquare,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
export type AllowedQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface GenerateWithAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (aiQuestions: any[]) => void;
}

const QUESTION_TYPES: { id: AllowedQuestionType; label: string; desc: string }[] = [
  { id: 'SINGLE_CHOICE', label: 'Single Choice', desc: 'Standard single best answer MCQ' },
  { id: 'MULTIPLE_CHOICE', label: 'Multiple Choice', desc: 'Multiple correct answers supported' },
  { id: 'TRUE_FALSE', label: 'True / False', desc: 'Binary statement validation' },
  { id: 'SHORT_ANSWER', label: 'Short Answer', desc: 'Exact string response' },
];

export function GenerateWithAIModal({
  isOpen,
  onClose,
  onGenerate,
}: GenerateWithAIModalProps) {
  const [topicDescription, setTopicDescription] = useState<string>('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('MEDIUM');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [allowedTypes, setAllowedTypes] = useState<AllowedQuestionType[]>([
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'SHORT_ANSWER',
  ]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleType = (typeId: AllowedQuestionType) => {
    setAllowedTypes((prev) => {
      if (prev.includes(typeId)) {
        if (prev.length <= 1) {
          toast.error('At least one question type must be selected.');
          return prev;
        }
        return prev.filter((t) => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setQuestionCount(1);
    } else {
      setQuestionCount(Math.min(20, Math.max(1, val)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!topicDescription.trim()) {
      setErrorMessage('Please provide a topic or paste syllabus content.');
      return;
    }

    if (allowedTypes.length === 0) {
      setErrorMessage('Please select at least one question type.');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic_description: topicDescription.trim(),
          difficulty,
          question_count: questionCount,
          allowed_types: allowedTypes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate questions using AI.');
      }

      const generatedQuestions = data.questions || [];

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        throw new Error('AI returned an empty array of questions.');
      }

      toast.success(`Successfully generated ${generatedQuestions.length} question(s)!`);
      
      // Hydrate parent state
      onGenerate(generatedQuestions);
      
      // Reset form & close
      onClose();
    } catch (err: any) {
      console.error('AI Quiz Generation error:', err);
      const msg = err.message || 'Something went wrong while contacting the AI Generator service.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) onClose();
      }}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-2xl transition-all">
        {/* Background AI Glow Styling */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#3525cd]/10 blur-3xl" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-[#eceef5] px-6 py-5 bg-gradient-to-r from-purple-50/60 via-white to-indigo-50/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#3525cd] to-purple-600 text-white shadow-md shadow-[#3525cd]/20">
              <Sparkles className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#191c1e]">Generate Questions with AI</h3>
                <span className="rounded-full bg-[#3525cd] px-2 py-0.5 text-[10px] font-extrabold uppercase text-white tracking-wider">
                  AI Magic
                </span>
              </div>
              <p className="text-xs text-[#696778]">
                Describe your topic or syllabus to build high-yield questions instantly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#777586] transition hover:bg-[#f7f7fb] hover:text-[#191c1e] disabled:opacity-40 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="relative p-6 space-y-5">
          {errorMessage ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-semibold text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {/* 1. Topic Description Textarea */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#3525cd]" />
                Topic or Syllabus Prompt <span className="text-red-500">*</span>
              </span>
              <span className="text-[11px] font-semibold text-purple-600">Max 2,000 chars</span>
            </label>
            <textarea
              rows={4}
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
              disabled={isGenerating}
              placeholder="e.g., Clinical features, diagnosis, and acute pharmacotherapy of Myocardial Infarction. Include high-yield USMLE Step 1 concepts..."
              className="w-full rounded-2xl border border-[#dadce5] bg-[#fdfdfd] p-3.5 text-xs text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white focus:ring-2 focus:ring-[#3525cd]/15 disabled:opacity-60 resize-none"
            />
          </div>

          {/* 2. Difficulty & Question Count Controls */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Difficulty Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-1.5 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-[#3525cd]" />
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                disabled={isGenerating}
                className="w-full min-h-11 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-xs font-bold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white focus:ring-2 focus:ring-[#3525cd]/15 disabled:opacity-60"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
                <option value="MIXED">MIXED (Balanced distribution)</option>
              </select>
            </div>

            {/* Question Count Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-1.5 flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-[#3525cd]" />
                Question Count (Max 20)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={handleCountChange}
                disabled={isGenerating}
                className="w-full min-h-11 rounded-xl border border-[#dadce5] bg-[#f7f7fb] px-3.5 text-xs font-bold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:bg-white focus:ring-2 focus:ring-[#3525cd]/15 disabled:opacity-60"
              />
            </div>
          </div>

          {/* 3. Allowed Question Types (Checkboxes) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4b4a58] mb-2 flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-[#3525cd]" />
              Allowed Question Types
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUESTION_TYPES.map((qt) => {
                const isSelected = allowedTypes.includes(qt.id);
                return (
                  <button
                    type="button"
                    key={qt.id}
                    onClick={() => handleToggleType(qt.id)}
                    disabled={isGenerating}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-[#3525cd] bg-purple-50/60 ring-1 ring-[#3525cd]'
                        : 'border-[#dadce5] bg-white hover:bg-[#f7f7fb]'
                    } disabled:opacity-60 cursor-pointer`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by button click
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#3525cd] focus:ring-[#3525cd]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#191c1e]">{qt.label}</div>
                      <div className="text-[11px] text-[#696778]">{qt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-[#eceef5] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="min-h-11 rounded-xl border border-[#dadce5] bg-white px-5 text-xs font-bold text-[#4b4a58] transition hover:bg-[#f7f7fb] disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isGenerating}
              className="relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3525cd] via-purple-600 to-indigo-600 px-6 text-xs font-bold text-white shadow-lg shadow-[#3525cd]/25 transition hover:shadow-purple-500/35 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span className="animate-pulse">Generating Questions...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
