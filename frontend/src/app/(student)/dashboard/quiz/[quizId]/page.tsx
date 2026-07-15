'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Clock3, FileText, Play } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';

interface QuizDetails {
  id: string;
  title: string;
  subject?: string | null;
  durationSec: number;
  totalQuestions: number;
}

interface StartExamResponse {
  attemptId: string;
  durationSec: number;
  questions: unknown[];
}

interface ApiEnvelope<T> {
  data?: T;
}

const EXAM_RULES = [
  'Cannot pause or reset timer once examination begins.',
  'Every answer is auto-saved immediately.',
  'Timer expiry triggers automatic final submission.',
  'Please avoid refreshing the page during the exam.',
];

function parseQuizDetails(payload: unknown): QuizDetails {
  const source = payload as Record<string, unknown>;
  const nested = (source?.data as Record<string, unknown> | undefined) ?? source;

  const countObj = nested?._count as Record<string, unknown> | undefined;
  const inferredTotal =
    typeof nested?.totalQuestions === 'number'
      ? nested.totalQuestions
      : typeof countObj?.questions === 'number'
        ? countObj.questions
        : Array.isArray(nested?.questions)
          ? nested.questions.length
          : 0;

  return {
    id: String(nested?.id ?? ''),
    title: String(nested?.title ?? 'Untitled Quiz'),
    subject: (nested?.subject as string | null | undefined) ?? null,
    durationSec:
      typeof nested?.durationSec === 'number'
        ? nested.durationSec
        : typeof nested?.duration === 'number'
          ? nested.duration
          : 0,
    totalQuestions: inferredTotal,
  };
}

function parseStartResponse(payload: unknown): StartExamResponse {
  const source = payload as Record<string, unknown>;
  const nested = (source?.data as Record<string, unknown> | undefined) ?? source;

  return {
    attemptId: String(nested?.attemptId ?? nested?.id ?? ''),
    durationSec: Number(nested?.durationSec ?? 0),
    questions: Array.isArray(nested?.questions) ? nested.questions : [],
  };
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'No time limit';
  return `${Math.floor(seconds / 60)} minutes`;
}

export default function QuizLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = String(params.quizId ?? '');

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationLabel = useMemo(() => formatDuration(quiz?.durationSec ?? 0), [quiz?.durationSec]);

  useEffect(() => {
    let cancelled = false;

    async function loadQuiz() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get<ApiEnvelope<unknown>>(`/quizzes/${quizId}`);
        const parsed = parseQuizDetails(response.data);

        if (!cancelled) {
          if (!parsed.id) {
            setError('Quiz not found.');
          } else {
            setQuiz(parsed);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load quiz details right now.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (!quizId) {
      setError('Invalid quiz id.');
      setIsLoading(false);
      return;
    }

    void loadQuiz();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const handleStartExam = useCallback(async () => {
    if (!quizId || isStarting) return;

    try {
      setIsStarting(true);
      setError(null);

      const response = await api.post<ApiEnvelope<unknown>>(`/quiz/quizzes/${quizId}/start`);
      const startData = parseStartResponse(response.data);

      if (!startData.attemptId) {
        throw new Error('Missing attempt id');
      }

      const cacheKey = `dq-attempt-${startData.attemptId}`;
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          attemptId: startData.attemptId,
          quizTitle: quiz?.title ?? 'Student Examination',
          durationSec: startData.durationSec,
          questions: startData.questions,
        })
      );

      router.push(`/dashboard/quiz/attempt/${startData.attemptId}`);
    } catch {
      setIsStarting(false);
      setError('Unable to start examination. Please try again.');
    }
  }, [isStarting, quiz?.title, quizId, router]);

  if (isLoading) {
    return (
      <div className="mx-auto mt-10 w-full max-w-3xl p-4">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-100" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-gray-100" />
            <div className="h-32 animate-pulse rounded bg-gray-100" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || error) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center p-4">
        <Card className="w-full border-red-200 bg-red-50 text-red-900 shadow-sm">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm font-medium">{error ?? 'Quiz unavailable.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-3xl p-4">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="space-y-1.5 border-b border-gray-100 pb-6">
          <CardDescription className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Student Exam Arena
          </CardDescription>
          <CardTitle className="text-3xl font-bold tracking-tight text-purple-600">
            {quiz.title}
          </CardTitle>
          <CardDescription className="text-base font-medium text-gray-600">
            {quiz.subject || 'General Medicine'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-8">
          {/* Stats Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-5 transition-colors hover:bg-gray-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Questions</p>
                <p className="text-xl font-black text-gray-900">{quiz.totalQuestions}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-5 transition-colors hover:bg-gray-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <Clock3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Time Allowed</p>
                <p className="text-xl font-black text-gray-900">{durationLabel}</p>
              </div>
            </div>
          </div>

          {/* Instructions section */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A435F0] text-[10px] text-white">!</span>
              Critical Examination Rules
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {EXAM_RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-3 text-sm font-medium text-gray-700">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A435F0]/60" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-center text-sm font-bold text-red-600 border border-red-100">
              {error}
            </p>
          )}
        </CardContent>

        <CardFooter className="border-t border-gray-100 bg-gray-50/50 p-8">
          <Button
            type="button"
            onClick={() => void handleStartExam()}
            disabled={isStarting}
            size="lg"
            className="h-14 w-full rounded-lg bg-purple-600 text-lg font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-70"
          >
            {isStarting ? (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Initializing Exam...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Play className="h-5 w-5 fill-current" />
                <span>Start Examination</span>
              </div>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

