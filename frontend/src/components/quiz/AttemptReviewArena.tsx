'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Trophy,
  XCircle,
  BarChart3,
  CalendarCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ─── Types ──────────────────────────────────────────────────────

type OptionKey = 'A' | 'B' | 'C' | 'D';

type AttemptQuestion = {
  id: string;
  questionText: string;
  imageUrl?: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: OptionKey;
  explanation?: string | null;
};

type AttemptAnswer = {
  id: string;
  selected: OptionKey;
  isCorrect: boolean;
  question: AttemptQuestion;
};

type AttemptReview = {
  id: string;
  score: number;
  totalQs: number;
  timeTakenSec?: number | null;
  startedAt: string;
  finishedAt?: string | null;
  quiz?: { id: string; title: string } | null;
  category?: { id: string; name: string } | null;
  answers: AttemptAnswer[];
};

type AttemptReviewArenaProps = {
  attempt: AttemptReview;
};

type FilterMode = 'all' | 'correct' | 'incorrect';

// ─── Constants ──────────────────────────────────────────────────

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

const optionFieldMap: Record<OptionKey, keyof AttemptQuestion> = {
  A: 'optionA',
  B: 'optionB',
  C: 'optionC',
  D: 'optionD',
};

// ─── Helpers ────────────────────────────────────────────────────

function formatDuration(totalSeconds?: number | null): string {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return 'N/A';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

// ─── Stat Card ──────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-sm">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Accuracy Breakdown Card ────────────────────────────────────

interface AccuracyBreakdownProps {
  correct: number;
  incorrect: number;
  skipped: number;
}

function AccuracyBreakdown({ correct, incorrect, skipped }: AccuracyBreakdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
          <BarChart3 size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Accuracy
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              🟢 {correct}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
              🔴 {incorrect}
            </span>
            {skipped > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                ⚪ {skipped}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Accordion Question Row ─────────────────────────────────────

interface AccordionQuestionProps {
  answer: AttemptAnswer;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionQuestion({ answer, index, isOpen, onToggle }: AccordionQuestionProps) {
  const correct = answer.question.correctOption;

  return (
    <div
      className="overflow-hidden border-b border-border last:border-b-0"
      role="region"
      aria-label={`Question ${index + 1}`}
    >
      {/* Collapsed Row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex min-w-0 items-center gap-3">
          {/* Status Icon */}
          {answer.isCorrect ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            </span>
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <XCircle size={16} className="text-red-600 dark:text-red-400" />
            </span>
          )}

          {/* Question Label + Truncated Text */}
          <div className="min-w-0">
            <span className="mr-2 text-sm font-bold text-foreground">Q{index + 1}</span>
            <span className="truncate text-sm text-muted-foreground">
              {answer.question.questionText.length > 80
                ? `${answer.question.questionText.slice(0, 80)}…`
                : answer.question.questionText}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={18} className="text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={`detail-${answer.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="border-t border-border bg-muted/30 px-4 py-5 md:px-6">
              {/* Full Question Text */}
              <p className="mb-4 text-base font-semibold leading-7 text-foreground">
                {answer.question.questionText}
              </p>

              {/* Question Image */}
              {answer.question.imageUrl && (
                <div className="mb-4 overflow-hidden rounded-lg border border-border bg-background">
                  <img
                    src={answer.question.imageUrl}
                    alt="Question illustration"
                    className="h-auto w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Options Grid */}
              <div className="space-y-2">
                {OPTION_KEYS.map((optionKey) => {
                  const optionText = String(answer.question[optionFieldMap[optionKey]] ?? '');
                  const isSelected = answer.selected === optionKey;
                  const isCorrectOption = correct === optionKey;

                  // Color-coding logic:
                  // Selected + correct → green
                  // Selected + wrong → red
                  // Not selected but is the correct answer → light green highlight
                  // Default → neutral
                  let stateClass: string;
                  let indicator: React.ReactNode = null;

                  if (isSelected && answer.isCorrect) {
                    stateClass = 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
                    indicator = <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />;
                  } else if (isSelected && !answer.isCorrect) {
                    stateClass = 'border-red-300 bg-red-50 text-red-950 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200';
                    indicator = <XCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />;
                  } else if (isCorrectOption) {
                    stateClass = 'border-emerald-200 bg-emerald-50/60 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300';
                    indicator = <CheckCircle2 size={16} className="shrink-0 text-emerald-500 dark:text-emerald-500" />;
                  } else {
                    stateClass = 'border-border bg-background text-foreground';
                  }

                  return (
                    <div
                      key={`${answer.id}-${optionKey}`}
                      className={`flex items-center justify-between rounded-lg border p-3 transition ${stateClass}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/5 text-xs font-bold text-muted-foreground dark:bg-white/10">
                          {optionKey}
                        </span>
                        <span className="text-sm leading-6">{optionText}</span>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        {isSelected && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            Your answer
                          </span>
                        )}
                        {!isSelected && isCorrectOption && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Correct
                          </span>
                        )}
                        {indicator}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation / Rationale */}
              {answer.question.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
                >
                  <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-300">
                    <AlertCircle size={14} />
                    Learning Moment
                  </p>
                  <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                    {answer.question.explanation}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function AttemptReviewArena({ attempt }: AttemptReviewArenaProps) {
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const percentage = attempt.totalQs > 0 ? Math.round((attempt.score / attempt.totalQs) * 100) : 0;
  const title = attempt.quiz?.title || attempt.category?.name || 'Quiz Attempt';

  // Accuracy stats — "skipped" = total questions minus answered questions
  const correctCount = attempt.answers.filter((a) => a.isCorrect).length;
  const incorrectCount = attempt.answers.filter((a) => !a.isCorrect).length;
  const skippedCount = Math.max(0, attempt.totalQs - attempt.answers.length);

  // Filtered answers based on selected filter
  const filteredAnswers = useMemo(() => {
    switch (filterMode) {
      case 'correct':
        return attempt.answers.filter((a) => a.isCorrect);
      case 'incorrect':
        return attempt.answers.filter((a) => !a.isCorrect);
      default:
        return attempt.answers;
    }
  }, [attempt.answers, filterMode]);

  const toggleQuestion = useCallback((answerId: string) => {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(answerId)) {
        next.delete(answerId);
      } else {
        next.add(answerId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setOpenQuestions(new Set(filteredAnswers.map((a) => a.id)));
  }, [filteredAnswers]);

  const collapseAll = useCallback(() => {
    setOpenQuestions(new Set());
  }, []);

  return (
    <div className="space-y-6 px-1 py-2 md:px-0">
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground md:text-2xl">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Exam Review</p>
        </div>
        <Badge
          className={`px-3 py-1.5 text-sm font-bold ${
            percentage >= 70
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
          }`}
        >
          {percentage >= 70 ? '✓ PASSED' : '✗ FAILED'} — {percentage}%
        </Badge>
      </motion.div>

      {/* ── 4 Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Trophy size={20} className="text-amber-600 dark:text-amber-400" />}
          label="Score"
          value={`${attempt.score} / ${attempt.totalQs}`}
          accent="bg-amber-100 dark:bg-amber-900/40"
        />
        <StatCard
          icon={<Clock3 size={20} className="text-blue-600 dark:text-blue-400" />}
          label="Time Taken"
          value={formatDuration(attempt.timeTakenSec)}
          accent="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          icon={<CalendarCheck size={20} className="text-teal-600 dark:text-teal-400" />}
          label="Completed"
          value={
            attempt.finishedAt
              ? new Date(attempt.finishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'In Progress'
          }
          accent="bg-teal-100 dark:bg-teal-900/40"
        />
        <AccuracyBreakdown
          correct={correctCount}
          incorrect={incorrectCount}
          skipped={skippedCount}
        />
      </div>

      {/* ── Smart Review Section ─────────────────────────────── */}
      {attempt.answers.length > 0 ? (
        <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
          <CardHeader className="gap-3 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base font-bold text-foreground md:text-lg">
                Question Review
              </CardTitle>

              {/* Expand / Collapse All */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={expandAll}
                  className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Expand All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={collapseAll}
                  className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Collapse All
                </Button>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              {([
                { mode: 'all' as FilterMode, label: `All (${attempt.answers.length})` },
                { mode: 'correct' as FilterMode, label: `Correct (${correctCount})` },
                { mode: 'incorrect' as FilterMode, label: `Incorrect (${incorrectCount})` },
              ]).map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    filterMode === mode
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredAnswers.length > 0 ? (
              filteredAnswers.map((answer, idx) => (
                <AccordionQuestion
                  key={answer.id}
                  answer={answer}
                  index={
                    // Preserve original question numbering regardless of filter
                    filterMode === 'all'
                      ? idx
                      : attempt.answers.indexOf(answer)
                  }
                  isOpen={openQuestions.has(answer.id)}
                  onToggle={() => toggleQuestion(answer.id)}
                />
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No {filterMode} answers to display.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-dashed border-border bg-muted/40 text-center shadow-none">
          <CardContent className="py-10">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">No answer details recorded</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The score summary is available, but this attempt has no saved answer review rows.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
