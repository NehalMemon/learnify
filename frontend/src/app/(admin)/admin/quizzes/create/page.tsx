"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import apiClient from "@/lib/api";
import { toast } from "react-hot-toast";

/* ─── Types ──────────────────────────────────────────────────────── */

type QuestionType = "SINGLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "MATCHING_PAIRS";

interface Category {
  id: string;
  name: string;
}

/** Single question (editable draft) */
interface QuestionDraft {
  type: QuestionType;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  /** For MATCHING_PAIRS: answer side of each pair */
  matchA: string;
  matchB: string;
  matchC: string;
  matchD: string;
  correctOption: string;
  explanation: string;
}

/** Full form payload sent to the API */
interface QuizForm {
  title: string;
  description: string;
  categoryId: string;
  questions: QuestionDraft[];
}

/* ─── Blank question template ───────────────────────────────────── */

const BLANK_QUESTION: QuestionDraft = {
  type: "SINGLE_CHOICE",
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  matchA: "",
  matchB: "",
  matchC: "",
  matchD: "",
  correctOption: "A",
  explanation: "",
};

/* ─── Option labels constant ────────────────────────────────────── */
const OPTIONS: readonly ["A", "B", "C", "D"] = ["A", "B", "C", "D"] as const;

/** Human-readable labels for question types */
const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single Choice",
  TRUE_FALSE: "True / False",
  MULTIPLE_SELECT: "Multiple Select",
  MATCHING_PAIRS: "Matching Pairs",
};

/** Palette items for the right column */
const QUESTION_TYPE_CARDS: { type: QuestionType; label: string; icon: string }[] = [
  { type: "SINGLE_CHOICE", label: "Single Choice", icon: "○" },
  { type: "TRUE_FALSE", label: "True / False", icon: "◑" },
  { type: "MULTIPLE_SELECT", label: "Multiple Select", icon: "☑" },
  { type: "MATCHING_PAIRS", label: "Matching Pairs", icon: "⇔" },
];

/* ─── Page Component ─────────────────────────────────────────────── */

export default function CreateQuizPage() {
  const router = useRouter();

  /* ── Wizard step ─────────────────────────────────────────────── */
  const [step, setStep] = useState<1 | 2>(1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  /* ── React Hook Form ─────────────────────────────────────────── */
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<QuizForm>({
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      questions: [],
    },
  });

  const { fields: questionFields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  /* ── Categories ──────────────────────────────────────────────── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: Category[] }>("/quiz/categories")
      .then((res) => setCategories(res.data.data))
      .catch(() => setLoadError("Failed to load categories. Please refresh."));
  }, []);

  /* ── Watched values ──────────────────────────────────────────── */
  const watchedTitle = watch("title");
  const watchedQuestions = watch("questions");

  /* ── Step 1 → Step 2 transition ──────────────────────────────── */
  const advanceToStep2 = () => {
    const title = getValues("title");
    const categoryId = getValues("categoryId");

    if (!title.trim()) {
      toast.error("Quiz title is required.");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category.");
      return;
    }
    setStep(2);
  };

  /* ── Final publish ───────────────────────────────────────────── */
  const onPublish = async (formData: QuizForm) => {
    if (!formData.questions || formData.questions.length === 0) {
      toast.error("You must add at least one question to publish this quiz.");
      return;
    }
    setIsPublishing(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        durationSec: 60 * 60,
        questions: formData.questions,
      };
      const res = await apiClient.post<{ success: boolean; message: string }>(
        "/admin/quizzes/full",
        payload,
      );
      toast.success(res.data.message ?? "Quiz published!");
      setTimeout(() => router.push("/admin/quizzes"), 800);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to publish quiz.";
      toast.error(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  /* ── Add question helper ─────────────────────────────────────── */
  const addNewQuestion = useCallback(
    (type: QuestionType) => {
      const currentQuestions = watch("questions") || [];
      const newIndex = currentQuestions.length;

      // Append with the specific type requested
      append({ ...BLANK_QUESTION, type });

      // Set active index safely using the pre-read length
      setActiveIndex(newIndex);
    },
    [append, watch],
  );

  /* ── Remove question helper ──────────────────────────────────── */
  const removeQuestion = useCallback(
    (idx: number) => {
      const currentQuestions = getValues("questions");
      const updated = currentQuestions.filter((_, i) => i !== idx);
      setValue("questions", updated);

      if (activeIndex === idx) {
        setActiveIndex(null);
      } else if (activeIndex !== null && activeIndex > idx) {
        setActiveIndex(activeIndex - 1);
      }
    },
    [activeIndex, getValues, setValue],
  );

  /* ── Question field change helper ────────────────────────────── */
  const handleQuestionChange = useCallback(
    (idx: number, field: keyof QuestionDraft, value: string) => {
      const currentQuestions = getValues("questions");
      const updated = [...currentQuestions];
      updated[idx] = { ...updated[idx], [field]: value };
      setValue("questions", updated);
    },
    [getValues, setValue],
  );

  /* ═══════════════════════════════════════════════════════════════
   *  STEP 1 — Setup Screen
   * ═══════════════════════════════════════════════════════════════ */
  const renderStep1 = () => (
    <div className="min-h-screen flex items-start justify-center bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-2xl w-full mx-auto mt-10 p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Back link */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-900"
        >
          ← Back
        </button>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Create New Quiz
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Set up the basics, then build your questions in the editor.
        </p>

        {/* Title */}
        <div className="mb-5">
          <label
            htmlFor="quiz-title"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Quiz Title <span className="text-red-500">*</span>
          </label>
          <input
            id="quiz-title"
            type="text"
            placeholder="e.g. Anatomy Midterm 1"
            {...register("title", { required: "Quiz title is required" })}
            className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 ${
              errors.title ? "border-red-400" : "border-gray-300"
            }`}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="mb-5">
          <label
            htmlFor="quiz-description"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Description{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="quiz-description"
            rows={3}
            placeholder="Brief overview of the quiz…"
            {...register("description")}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 resize-none"
          />
        </div>

        {/* Category */}
        <div className="mb-8">
          <label
            htmlFor="quiz-category"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="quiz-category"
            {...register("categoryId", { required: "Category is required" })}
            className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 ${
              errors.categoryId ? "border-red-400" : "border-gray-300"
            }`}
          >
            <option value="">Select category…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.categoryId.message}
            </p>
          )}
          {loadError && (
            <p className="mt-1 text-sm text-red-600">{loadError}</p>
          )}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={advanceToStep2}
          className="w-full rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 hover:shadow-md"
        >
          Next: Build Quiz →
        </button>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
   *  STEP 2 — 3-Column Split-Pane Canvas
   * ═══════════════════════════════════════════════════════════════ */
  const renderStep2 = () => (
    <form
      onSubmit={handleSubmit(onPublish)}
      className="flex flex-col h-[calc(100vh-64px)] w-full bg-white"
    >
      {/* ── Top Action Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-gray-500 hover:text-gray-900 transition"
            aria-label="Back to setup"
          >
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
            {watchedTitle || "Untitled Quiz"}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {watchedQuestions?.length ?? 0} question
            {(watchedQuestions?.length ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toast.success("Draft saved!")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
          >
            Save Draft
          </button>
          <button
            type="submit"
            disabled={isPublishing}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Publishing…
              </span>
            ) : (
              "Publish"
            )}
          </button>
        </div>
      </div>

      {/* ── Main Workspace Row ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Column 1: Question Navigator ────────────────────── */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full overflow-y-auto">
          <div className="p-3 border-b border-gray-200 shrink-0">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Questions
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {watchedQuestions?.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`w-full text-left p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                  activeIndex === idx
                    ? "bg-purple-50 border-l-4 border-l-purple-600"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      activeIndex === idx
                        ? "bg-purple-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-gray-700 truncate">
                      {q.questionText
                        ? q.questionText.slice(0, 30) +
                          (q.questionText.length > 30 ? "…" : "")
                        : "Untitled question"}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                      {TYPE_LABELS[q.type] ?? "Unknown"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Column 2: The Editor ────────────────────────────── */}
        <div className="flex-1 bg-white p-8 overflow-y-auto">
          {activeIndex === null ? (
            /* ── Empty State ────────────────────────────────────── */
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              {/* Target icon */}
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <svg
                  className="h-10 w-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="6" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="2" strokeWidth="1.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Question Selected
              </h3>
              <p className="text-sm text-gray-400 max-w-sm">
                Select a question from the left panel or add a new one from the
                right.
              </p>
            </div>
          ) : (
            /* ── Question Editor ────────────────────────────────── */
            (() => {
              const activeQuestion = watchedQuestions?.[activeIndex];
              if (!activeQuestion) return null;
              return (
            <div className="max-w-2xl mx-auto">
              {/* Editor header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
                    {activeIndex + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-500">
                    Question {activeIndex + 1} of{" "}
                    {watchedQuestions?.length ?? 0}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeQuestion(activeIndex);
                    setActiveIndex(null);
                  }}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                >
                  🗑️ Remove Question
                </button>
              </div>

              {/* Type badge */}
              <div className="mb-5">
                <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 uppercase tracking-wide">
                  {TYPE_LABELS[activeQuestion.type] ?? "Unknown"}
                </span>
              </div>

              {/* Question text — shared across all types */}
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter question text…"
                  value={activeQuestion.questionText}
                  onChange={(e) =>
                    handleQuestionChange(activeIndex, "questionText", e.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* ── Type-specific inputs ──────────────────────────── */}

              {activeQuestion.type === "SINGLE_CHOICE" && (
                <>
                  {/* 4 options */}
                  <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {OPTIONS.map((opt) => (
                      <div key={opt} className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                          {opt}
                        </span>
                        <input
                          type="text"
                          placeholder={`Option ${opt}`}
                          value={(activeQuestion[`option${opt}` as keyof QuestionDraft] as string) ?? ""}
                          onChange={(e) =>
                            handleQuestionChange(activeIndex, `option${opt}` as keyof QuestionDraft, e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-8 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Single correct dropdown */}
                  <div className="flex items-center gap-2 mb-5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Correct</label>
                    <select
                      value={activeQuestion.correctOption}
                      onChange={(e) => handleQuestionChange(activeIndex, "correctOption", e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-purple-400"
                    >
                      {OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeQuestion.type === "TRUE_FALSE" && (
                <>
                  {/* True / False correct selector */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Correct Answer
                    </label>
                    <div className="flex gap-3">
                      {(["A", "B"] as const).map((val) => {
                        const label = val === "A" ? "True" : "False";
                        const isSelected = activeQuestion.correctOption === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleQuestionChange(activeIndex, "correctOption", val)}
                            className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition ${
                              isSelected
                                ? "border-purple-600 bg-purple-50 text-purple-700"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeQuestion.type === "MULTIPLE_SELECT" && (
                <>
                  {/* 4 options */}
                  <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {OPTIONS.map((opt) => (
                      <div key={opt} className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                          {opt}
                        </span>
                        <input
                          type="text"
                          placeholder={`Option ${opt}`}
                          value={(activeQuestion[`option${opt}` as keyof QuestionDraft] as string) ?? ""}
                          onChange={(e) =>
                            handleQuestionChange(activeIndex, `option${opt}` as keyof QuestionDraft, e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-8 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Multiple correct checkboxes */}
                  <div className="mb-5">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Correct Options (select all that apply)
                    </label>
                    <div className="flex gap-4">
                      {OPTIONS.map((opt) => {
                        // correctOption stores comma-separated values e.g. "A,C"
                        const selected = (activeQuestion.correctOption ?? "").split(",");
                        const isChecked = selected.includes(opt);
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const next = isChecked
                                  ? selected.filter((v) => v !== opt)
                                  : [...selected, opt];
                                handleQuestionChange(
                                  activeIndex,
                                  "correctOption",
                                  next.filter(Boolean).join(","),
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-gray-700">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeQuestion.type === "MATCHING_PAIRS" && (
                <>
                  {/* 4 pairs of inputs */}
                  <div className="mb-5 space-y-3">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Matching Pairs
                    </label>
                    {OPTIONS.map((opt) => (
                      <div key={opt} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                          {opt}
                        </span>
                        <input
                          type="text"
                          placeholder={`Prompt ${opt}`}
                          value={(activeQuestion[`option${opt}` as keyof QuestionDraft] as string) ?? ""}
                          onChange={(e) =>
                            handleQuestionChange(activeIndex, `option${opt}` as keyof QuestionDraft, e.target.value)
                          }
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                        />
                        <span className="text-gray-400">⇔</span>
                        <input
                          type="text"
                          placeholder={`Answer ${opt}`}
                          value={(activeQuestion[`match${opt}` as keyof QuestionDraft] as string) ?? ""}
                          onChange={(e) =>
                            handleQuestionChange(activeIndex, `match${opt}` as keyof QuestionDraft, e.target.value)
                          }
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Explanation — shared across all types */}
              <div className="mt-5">
                <input
                  type="text"
                  placeholder="Explanation (optional)"
                  value={activeQuestion.explanation}
                  onChange={(e) =>
                    handleQuestionChange(activeIndex, "explanation", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>
              );
            })()
          )}
        </div>

        {/* ─── Column 3: Tool Palette & AI ─────────────────────── */}
        <div className="w-72 border-l border-gray-200 bg-gray-50 p-4 flex flex-col gap-6 overflow-y-auto">
          {/* AI Generator */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
              AI Tools
            </h3>
            <Link
              href="/admin/quizzes/ai-generator"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-lg hover:shadow-md transition-all font-medium text-sm"
            >
              ✨ Generate with AI
            </Link>
          </div>

          {/* Question type cards */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Add Question
            </h3>
            <div className="grid gap-2">
              {QUESTION_TYPE_CARDS.map((card) => (
                <button
                  key={card.type}
                  type="button"
                  onClick={() => addNewQuestion(card.type)}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-base">
                    {card.icon}
                  </span>
                  {card.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );

  /* ═══════════════════════════════════════════════════════════════
   *  Render
   * ═══════════════════════════════════════════════════════════════ */
  return <>{step === 1 ? renderStep1() : renderStep2()}</>;
}
