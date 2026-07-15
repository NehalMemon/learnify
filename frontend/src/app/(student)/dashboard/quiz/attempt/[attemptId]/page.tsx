'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clock3, LogOut, Save, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/Spinner';

interface AttemptQuestion {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

interface AttemptMeta {
  attemptId: string;
  quizTitle: string;
  durationSec: number;
  startedAt?: string;
}

interface ApiEnvelope<T> {
  data?: T;
}

type OptionKey = 'A' | 'B' | 'C' | 'D';
type Answers = Record<string, OptionKey>;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

const optionFieldMap: Record<OptionKey, keyof AttemptQuestion> = {
  A: 'optionA',
  B: 'optionB',
  C: 'optionC',
  D: 'optionD',
};

function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function normalizeAttemptResponse(payload: unknown, fallbackId: string): AttemptMeta & { questions: AttemptQuestion[]; answers: Answers } {
  const source = payload as Record<string, unknown>;
  const nested = (source?.data as Record<string, unknown> | undefined) ?? source;
  const questions = Array.isArray(nested?.questions) ? (nested.questions as AttemptQuestion[]) : [];
  const answers: Answers = {};

  if (typeof nested?.answers === 'object' && nested.answers !== null && !Array.isArray(nested.answers)) {
    Object.entries(nested.answers as Record<string, unknown>).forEach(([questionId, selected]) => {
      if (OPTION_KEYS.includes(selected as OptionKey)) {
        answers[questionId] = selected as OptionKey;
      }
    });
  }

  if (Array.isArray(nested?.answers)) {
    nested.answers.forEach((answer) => {
      const row = answer as { questionId?: string; selected?: OptionKey; question?: { id?: string } };
      const questionId = row.questionId ?? row.question?.id;
      if (questionId && OPTION_KEYS.includes(row.selected as OptionKey)) {
        answers[questionId] = row.selected as OptionKey;
      }
    });
  }

  return {
    attemptId: String(nested?.attemptId ?? nested?.id ?? fallbackId),
    quizTitle: String(nested?.quizTitle ?? nested?.title ?? nested?.quiz?.title ?? 'Student Examination'),
    durationSec: Number(nested?.durationSec ?? 0),
    startedAt: nested?.startedAt ? String(nested.startedAt) : undefined,
    questions,
    answers,
  };
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  return (error as { response?: { status?: number } }).response?.status;
}

export default function AttemptArenaPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = String(params.attemptId ?? '');

  const [attemptMeta, setAttemptMeta] = useState<AttemptMeta | null>(null);
  const [questions, setQuestions] = useState<AttemptQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [isQuitDialogOpen, setIsQuitDialogOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const finalizedRef = useRef(false);
  const answersRef = useRef<Answers>({});
  const saveTimersRef = useRef<Record<string, number>>({});
  const pendingSavesRef = useRef<Set<string>>(new Set());
  const timerEndAtRef = useRef(0);

  const persistAnswers = useCallback(
    (nextAnswers: Answers) => {
      answersRef.current = nextAnswers;
      if (attemptId) {
        sessionStorage.setItem(`dq-answers-${attemptId}`, JSON.stringify(nextAnswers));
      }
    },
    [attemptId]
  );

  const sendAnswerToRedis = useCallback(
    async (questionId: string, selected: OptionKey) => {
      await api.post(`/quiz/attempts/${attemptId}/answer`, {
        questionId,
        selected,
      });
    },
    [attemptId]
  );

  const scheduleAnswerSave = useCallback(
    (questionId: string) => {
      if (!attemptId) return;

      window.clearTimeout(saveTimersRef.current[questionId]);
      pendingSavesRef.current.add(questionId);
      setSaveState('saving');

      saveTimersRef.current[questionId] = window.setTimeout(() => {
        const selected = answersRef.current[questionId];
        delete saveTimersRef.current[questionId];

        if (!selected || finalizedRef.current) return;

        void sendAnswerToRedis(questionId, selected)
          .then(() => {
            pendingSavesRef.current.delete(questionId);
            setSaveState(pendingSavesRef.current.size > 0 ? 'saving' : 'saved');
          })
          .catch(() => {
            setSaveState('error');
          });
      }, 450);
    },
    [attemptId, sendAnswerToRedis]
  );

  const flushPendingSaves = useCallback(async () => {
    const questionIds = Array.from(pendingSavesRef.current);

    questionIds.forEach((questionId) => {
      window.clearTimeout(saveTimersRef.current[questionId]);
      delete saveTimersRef.current[questionId];
    });

    await Promise.allSettled(
      questionIds.map((questionId) => {
        const selected = answersRef.current[questionId];
        return selected ? sendAnswerToRedis(questionId, selected) : Promise.resolve();
      })
    );

    pendingSavesRef.current.clear();
    setSaveState('saved');
  }, [sendAnswerToRedis]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateAttempt() {
      try {
        setIsLoading(true);
        setError(null);

        const cacheKey = `dq-attempt-${attemptId}`;
        const answersKey = `dq-answers-${attemptId}`;
        const cachedAttempt = sessionStorage.getItem(cacheKey);
        const cachedAnswers = sessionStorage.getItem(answersKey);

        if (cachedAttempt) {
          const rawCached = JSON.parse(cachedAttempt) as Record<string, unknown>;
          if (!rawCached.clientStartedAt && !rawCached.startedAt && !(rawCached.data as { startedAt?: string } | undefined)?.startedAt) {
            rawCached.clientStartedAt = new Date().toISOString();
            sessionStorage.setItem(cacheKey, JSON.stringify(rawCached));
          }

          const parsed = normalizeAttemptResponse(rawCached, attemptId);
          const restoredAnswers = cachedAnswers ? (JSON.parse(cachedAnswers) as Answers) : parsed.answers;

          if (!parsed.questions.length) {
            throw new Error('No questions found for this attempt.');
          }

          if (!cancelled) {
            const startTime = parsed.startedAt || String(rawCached.clientStartedAt ?? '');
            const startTimestamp = startTime ? new Date(startTime).getTime() : Date.now();
            const endTimestamp = startTimestamp + parsed.durationSec * 1000;

            timerEndAtRef.current = endTimestamp;
            setAttemptMeta({
              attemptId: parsed.attemptId,
              quizTitle: parsed.quizTitle,
              durationSec: parsed.durationSec,
              startedAt: parsed.startedAt,
            });
            setQuestions(parsed.questions);
            setAnswers(restoredAnswers);
            persistAnswers(restoredAnswers);
            setTimeLeft(Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000)));
          }
          return;
        }

        const response = await api.get<ApiEnvelope<unknown>>(`/quiz/attempts/${attemptId}`);
        const parsed = normalizeAttemptResponse(response.data, attemptId);

        if (!parsed.questions.length) {
          throw new Error('No questions found for this attempt.');
        }

        if (!cancelled) {
          const startTimestamp = parsed.startedAt ? new Date(parsed.startedAt).getTime() : Date.now();
          const endTimestamp = startTimestamp + parsed.durationSec * 1000;

          timerEndAtRef.current = endTimestamp;
          setAttemptMeta({
            attemptId: parsed.attemptId,
            quizTitle: parsed.quizTitle,
            durationSec: parsed.durationSec,
            startedAt: parsed.startedAt,
          });
          setQuestions(parsed.questions);
          setAnswers(parsed.answers);
          persistAnswers(parsed.answers);
          setTimeLeft(Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000)));
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load this exam attempt. Please return to the lobby.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (!attemptId) {
      setError('Invalid attempt id.');
      setIsLoading(false);
      return;
    }

    void hydrateAttempt();

    return () => {
      cancelled = true;
    };
  }, [attemptId, persistAnswers]);

  useEffect(() => {
    const timers = saveTimersRef.current;

    return () => {
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    if (!questions.length || !timerEndAtRef.current || finalizedRef.current) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((timerEndAtRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [questions.length]);

  const handleFinalize = useCallback(
    async (reason: 'manual' | 'auto') => {
      if (!attemptId || finalizedRef.current) return;

      try {
        finalizedRef.current = true;
        setIsFinalizing(true);
        setError(null);
        await flushPendingSaves();

        const totalDuration = attemptMeta?.durationSec ?? 0;
        const timeTakenSec = Math.max(0, totalDuration - timeLeft);
        await api.post(`/quiz/attempts/${attemptId}/finalize`, { timeTakenSec, reason });

        sessionStorage.removeItem(`dq-attempt-${attemptId}`);
        sessionStorage.removeItem(`dq-answers-${attemptId}`);
        router.push(`/dashboard/quiz/results/${attemptId}`);
      } catch (finalizeError: unknown) {
        const status = getErrorStatus(finalizeError);

        if (status === 400 || status === 403) {
          sessionStorage.removeItem(`dq-attempt-${attemptId}`);
          sessionStorage.removeItem(`dq-answers-${attemptId}`);
          router.push(`/dashboard/quiz/results/${attemptId}`);
        } else {
          finalizedRef.current = false;
          setError('Unable to finalize exam right now. Please try again.');
        }
      } finally {
        setIsFinalizing(false);
        setIsFinalizeDialogOpen(false);
      }
    },
    [attemptId, attemptMeta?.durationSec, flushPendingSaves, router, timeLeft]
  );

  useEffect(() => {
    if (!attemptMeta || finalizedRef.current) return;

    if (timeLeft === 60) {
      setToastMessage('Time is almost up. The exam will auto-submit in 60 seconds.');
      window.setTimeout(() => setToastMessage(null), 5000);
    }

    if (timeLeft === 0) {
      void handleFinalize('auto');
    }
  }, [attemptMeta, handleFinalize, timeLeft]);

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const totalQuestions = questions.length;
  const selected = currentQuestion ? answers[currentQuestion.id] ?? '' : '';
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const criticalTime = timeLeft <= 60;
  const answeredCount = Object.keys(answers).length;

  const handleOptionSelect = useCallback(
    (questionId: string, selectedOption: OptionKey) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: selectedOption };
        persistAnswers(next);
        return next;
      });

      scheduleAnswerSave(questionId);
    },
    [persistAnswers, scheduleAnswerSave]
  );

  const goToQuestion = useCallback(
    (index: number) => {
      setCurrentQuestionIndex(Math.max(0, Math.min(totalQuestions - 1, index)));
    },
    [totalQuestions]
  );

  const handlePrevious = useCallback(() => {
    goToQuestion(currentQuestionIndex - 1);
  }, [currentQuestionIndex, goToQuestion]);

  const handleNext = useCallback(() => {
    goToQuestion(currentQuestionIndex + 1);
  }, [currentQuestionIndex, goToQuestion]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-3xl rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-10 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-52 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !attemptMeta || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="flex w-full max-w-2xl items-start gap-3 rounded-md border border-red-200 bg-red-50 p-5 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm md:text-base">{error ?? 'Unable to render exam.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {toastMessage ? (
        <div className="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm">
          <AlertTriangle className="h-5 w-5" />
          {toastMessage}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <h1 className="min-w-0 truncate text-sm font-black text-slate-950 md:text-base">
            {attemptMeta.quizTitle}
          </h1>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <Dialog open={isQuitDialogOpen} onOpenChange={setIsQuitDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isFinalizing}
                  className="h-10 px-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <LogOut className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Quit Exam</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-200 bg-white text-slate-950">
                <DialogHeader>
                  <DialogTitle>Leave this exam?</DialogTitle>
                  <DialogDescription className="text-slate-600">
                    Your selected answers are saved in the background. The exam timer may continue while you are away.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsQuitDialogOpen(false)}>
                    Stay
                  </Button>
                  <Button variant="destructive" onClick={() => router.push('/dashboard/quizzes')}>
                    Quit Exam
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div
              className={[
                'sticky top-2 inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md border px-4 text-base font-black tabular-nums shadow-sm',
                criticalTime
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-purple-200 bg-purple-50 text-purple-800',
              ].join(' ')}
            >
              <Clock3 className="h-4 w-4" />
              {formatTimer(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {answeredCount}/{totalQuestions} answered
              </p>
            </div>

            <div
              className={[
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold',
                saveState === 'saving'
                  ? 'bg-blue-50 text-blue-700'
                  : saveState === 'error'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-emerald-50 text-emerald-700',
              ].join(' ')}
            >
              {saveState === 'saving' ? <Save className="h-3.5 w-3.5" /> : saveState === 'error' ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              {saveState === 'saving' ? 'Saving' : saveState === 'error' ? 'Sync issue' : 'Saved'}
            </div>
          </div>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-xl font-black leading-8 text-slate-950 md:text-2xl">
              {currentQuestion.questionText}
            </h2>

            <div className="mt-7 grid gap-3" role="radiogroup" aria-label="Multiple choice answers">
              {OPTION_KEYS.map((key) => {
                const optionText = String(currentQuestion[optionFieldMap[key]] ?? '');
                const isSelected = selected === key;

                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleOptionSelect(currentQuestion.id, key)}
                    className={[
                      'flex min-h-14 w-full items-start gap-3 rounded-md border p-4 text-left transition',
                      isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-950 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-purple-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black',
                        isSelected
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-300 bg-slate-100 text-slate-600',
                      ].join(' ')}
                    >
                      {key}
                    </span>
                    <span className="pt-1 text-sm font-semibold leading-6 md:text-base">{optionText}</span>
                  </button>
                );
              })}
            </div>
          </article>

          <div className="sticky bottom-0 z-30 mt-5 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || isFinalizing}
                className="h-11 border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {isLastQuestion ? (
                <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      disabled={isFinalizing}
                      className="h-11 bg-purple-700 px-5 font-bold text-white hover:bg-purple-800"
                    >
                      Finalize & Submit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-slate-200 bg-white text-slate-950">
                    <DialogHeader>
                      <DialogTitle>Submit final exam?</DialogTitle>
                      <DialogDescription className="text-slate-600">
                        This will flush pending answer saves and send the attempt for background grading.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsFinalizeDialogOpen(false)} disabled={isFinalizing}>
                        Cancel
                      </Button>
                      <Button onClick={() => void handleFinalize('manual')} disabled={isFinalizing} className="bg-purple-700 text-white hover:bg-purple-800">
                        {isFinalizing ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4" />
                            Submitting
                          </>
                        ) : (
                          'Yes, Submit'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isFinalizing}
                  className="h-11 bg-purple-700 px-5 font-bold text-white hover:bg-purple-800"
                >
                  Next Question
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950">Question Navigator</h2>
                <p className="mt-1 text-xs text-slate-500">Jump instantly, no page navigation.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                {answeredCount}/{totalQuestions}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const isActive = index === currentQuestionIndex;
                const isAnswered = Boolean(answers[question.id]);

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => goToQuestion(index)}
                    aria-label={`Go to question ${index + 1}`}
                    className={[
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition',
                      isAnswered ? 'bg-purple-700 text-white hover:bg-purple-800' : 'bg-slate-200 text-slate-600 hover:bg-slate-300',
                      isActive ? 'outline outline-2 outline-offset-2 outline-purple-700' : '',
                    ].join(' ')}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-200" />
                Unanswered
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-purple-700" />
                Answered
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-purple-700" />
                Active
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
