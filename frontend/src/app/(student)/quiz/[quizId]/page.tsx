"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

/* ─── Types ──────────────────────────────────────────────────────── */

type QuestionType = "SINGLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT";

interface QuizQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  options: { label: string; value: string }[];
}

interface Quiz {
  id: string;
  title: string;
  durationSec: number;
  questions: QuizQuestion[];
}

/** Answers dictionary — maps questionId → selected value(s) */
type AnswersMap = Record<string, string | string[]>;

/* ─── Mock Data ──────────────────────────────────────────────────── */

const MOCK_QUIZ: Quiz = {
  id: "quiz-mock-001",
  title: "Anatomy Midterm — Module 3",
  durationSec: 30 * 60, // 30 minutes
  questions: [
    {
      id: "q1",
      type: "SINGLE_CHOICE",
      questionText:
        "Which bone is the longest in the human body?",
      options: [
        { label: "A", value: "Humerus" },
        { label: "B", value: "Femur" },
        { label: "C", value: "Tibia" },
        { label: "D", value: "Fibula" },
      ],
    },
    {
      id: "q2",
      type: "TRUE_FALSE",
      questionText:
        "The mitral valve is located between the left atrium and the left ventricle.",
      options: [
        { label: "A", value: "True" },
        { label: "B", value: "False" },
      ],
    },
    {
      id: "q3",
      type: "MULTIPLE_SELECT",
      questionText:
        "Which of the following are cranial nerves? (Select all that apply)",
      options: [
        { label: "A", value: "Olfactory" },
        { label: "B", value: "Radial" },
        { label: "C", value: "Vagus" },
        { label: "D", value: "Trigeminal" },
      ],
    },
  ],
};

/* ─── Helper: format seconds → MM:SS ─────────────────────────────── */

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/* ─── Page Component ─────────────────────────────────────────────── */

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  /* ── State ───────────────────────────────────────────────────── */
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [timeLeft, setTimeLeft] = useState(MOCK_QUIZ.durationSec);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quiz = MOCK_QUIZ; // Will be replaced with API fetch later
  const totalQuestions = quiz.questions.length;
  const question = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  /* ── Countdown timer ─────────────────────────────────────────── */
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          toast.error("Time is up! Your quiz has been auto-submitted.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  /* ── Answer handlers ─────────────────────────────────────────── */

  /** Single Choice / True-False: set a single string */
  const handleSingleSelect = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    [],
  );

  /** Multiple Select: toggle a value in the array */
  const handleMultiSelect = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => {
        const current = (prev[questionId] as string[]) ?? [];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [questionId]: next };
      });
    },
    [],
  );

  /* ── Navigation ──────────────────────────────────────────────── */
  const goToPrev = () =>
    setCurrentQuestionIndex((i) => Math.max(0, i - 1));

  const goToNext = () =>
    setCurrentQuestionIndex((i) => Math.min(totalQuestions - 1, i + 1));

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    const unanswered = totalQuestions - answeredCount;
    if (unanswered > 0) {
      const proceed = window.confirm(
        `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit anyway?`,
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Replace with real API call
      // await quizApi.submitQuiz(quizId, { answers, timeTakenSec: MOCK_QUIZ.durationSec - timeLeft });
      toast.success("Quiz submitted successfully!");
      setTimeout(() => router.push("/quiz"), 1000);
    } catch {
      toast.error("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Derived: is the current option selected? ────────────────── */
  const isOptionSelected = (optionValue: string): boolean => {
    const answer = answers[question.id];
    if (!answer) return false;
    if (Array.isArray(answer)) return answer.includes(optionValue);
    return answer === optionValue;
  };

  /* ── Timer urgency class ─────────────────────────────────────── */
  const timerClass =
    timeLeft <= 60
      ? "text-red-600 animate-pulse"
      : timeLeft <= 300
        ? "text-amber-600"
        : "text-gray-900";

  /* ═══════════════════════════════════════════════════════════════
   *  Render
   * ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className="h-16 shrink-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
        {/* Left: Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100">
            <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m5 5V7a2 2 0 00-2-2h-5l-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-gray-900 truncate lg:text-base">
            {quiz.title}
          </h1>
        </div>

        {/* Center: Timer */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-1.5">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-sm font-mono font-bold tabular-nums ${timerClass}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Right: Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Submitting…
            </span>
          ) : (
            "Submit Exam"
          )}
        </button>
      </header>

      {/* ── Main Area ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar: Question Navigator ────────────────── */}
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Questions
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              {answeredCount} / {totalQuestions} answered
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-4 py-2">
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-600 transition-all duration-300"
                style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Question grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-4 gap-2">
              {quiz.questions.map((q, idx) => {
                const isActive = idx === currentQuestionIndex;
                const isAnswered = Boolean(
                  answers[q.id] &&
                    (Array.isArray(answers[q.id])
                      ? (answers[q.id] as string[]).length > 0
                      : (answers[q.id] as string).length > 0),
                );

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    aria-label={`Go to question ${idx + 1}`}
                    className={`
                      flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all
                      ${isActive ? "ring-2 ring-purple-600 ring-offset-1" : ""}
                      ${
                        isAnswered
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      }
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="border-t border-gray-200 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-purple-600 text-[10px] text-white">✓</span>
              Answered
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-[10px] text-gray-400">—</span>
              Unanswered
            </div>
          </div>
        </aside>

        {/* ─── Center Canvas: Active Question ──────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-8 py-10">
            {/* Question number + type badge */}
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
                {currentQuestionIndex + 1}
              </span>
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="ml-3 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  {question.type === "SINGLE_CHOICE"
                    ? "Single Choice"
                    : question.type === "TRUE_FALSE"
                      ? "True / False"
                      : "Multiple Select"}
                </span>
              </div>
            </div>

            {/* Question text */}
            <h2 className="mb-8 text-xl font-semibold leading-relaxed text-gray-900 lg:text-2xl">
              {question.questionText}
            </h2>

            {/* Instruction for multi-select */}
            {question.type === "MULTIPLE_SELECT" && (
              <p className="mb-4 text-sm text-purple-600 font-medium">
                Select all correct answers
              </p>
            )}

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option) => {
                const selected = isOptionSelected(option.value);
                const isMulti = question.type === "MULTIPLE_SELECT";

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() =>
                      isMulti
                        ? handleMultiSelect(question.id, option.value)
                        : handleSingleSelect(question.id, option.value)
                    }
                    className={`
                      group w-full flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all
                      ${
                        selected
                          ? "border-purple-600 bg-purple-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }
                    `}
                  >
                    {/* Option label badge */}
                    <span
                      className={`
                        flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors
                        ${
                          selected
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                        }
                      `}
                    >
                      {option.label}
                    </span>

                    {/* Option text */}
                    <span
                      className={`text-sm font-medium lg:text-base ${
                        selected ? "text-purple-900" : "text-gray-700"
                      }`}
                    >
                      {option.value}
                    </span>

                    {/* Check / radio indicator */}
                    <span className="ml-auto shrink-0">
                      {isMulti ? (
                        /* Checkbox */
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                            selected
                              ? "border-purple-600 bg-purple-600"
                              : "border-gray-300"
                          }`}
                        >
                          {selected && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                      ) : (
                        /* Radio */
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                            selected
                              ? "border-purple-600"
                              : "border-gray-300"
                          }`}
                        >
                          {selected && (
                            <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                onClick={goToPrev}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={goToNext}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                >
                  Next
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Finish & Submit
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
