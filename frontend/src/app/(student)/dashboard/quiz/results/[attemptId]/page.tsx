'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { AlertTriangle } from 'lucide-react';
import { quizApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';
import { AttemptReviewArena } from '@/components/quiz/AttemptReviewArena';

type AttemptPayload = {
  id: string;
  score: number;
  totalQs: number;
  timeTakenSec?: number | null;
  startedAt: string;
  finishedAt?: string | null;
  quiz?: { id: string; title: string } | null;
  category?: { id: string; name: string } | null;
  answers: Array<{
    id: string;
    selected: 'A' | 'B' | 'C' | 'D';
    isCorrect: boolean;
    question: {
      id: string;
      questionText: string;
      imageUrl?: string | null;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption?: 'A' | 'B' | 'C' | 'D';
      explanation?: string | null;
    };
  }>;
};

type ApiResponse = { data?: AttemptPayload } & AttemptPayload;

const MAX_REVIEW_LOAD_ATTEMPTS = 8;
const REVIEW_LOAD_RETRY_DELAY_MS = 1000;

function normalizeAttempt(payload: ApiResponse): AttemptPayload {
  const attempt = 'data' in payload && payload.data ? payload.data : payload;

  return {
    ...attempt,
    score: Number(attempt.score ?? 0),
    totalQs: Number(attempt.totalQs ?? 0),
    answers: Array.isArray(attempt.answers) ? attempt.answers : [],
  };
}

function getReviewLoadMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  const status = axiosError.response?.status;
  const apiMessage = axiosError.response?.data?.message;

  if (status === 401) return 'Your session expired. Please sign in again to view this exam review.';
  if (status === 400) {
    return apiMessage && apiMessage !== 'Validation failed.'
      ? apiMessage
      : 'This exam review link is invalid or incomplete.';
  }
  if (status === 403) return apiMessage || 'You do not have access to this exam review.';
  if (status === 404) return 'This exam review is not ready yet. Please refresh in a moment.';
  if (status === 429) return 'Review loading is rate-limited. Please wait a moment and try again.';

  return apiMessage || 'Unable to load exam review.';
}

export default function StudentAttemptReviewPage() {
  const params = useParams();
  const attemptId = String(params.attemptId ?? '');
  const [attempt, setAttempt] = useState<AttemptPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const loadAttempt = async (loadAttemptNumber = 1) => {
      let scheduledRetry = false;

      try {
        setIsLoading(true);
        setError(null);
        const response = await quizApi.getAttempt(attemptId);
        if (cancelled) return;
        const normalized = normalizeAttempt(response.data);

        // If the attempt hasn't finished grading yet (BullMQ worker still processing),
        // treat it as a retryable state rather than showing the empty answers UI.
        if (!normalized.finishedAt && loadAttemptNumber < MAX_REVIEW_LOAD_ATTEMPTS) {
          scheduledRetry = true;
          retryTimer = setTimeout(() => {
            retryTimer = null;
            void loadAttempt(loadAttemptNumber + 1);
          }, REVIEW_LOAD_RETRY_DELAY_MS);
          return;
        }

        setAttempt(normalized);
      } catch (loadError) {
        if (cancelled) return;

        const status = (loadError as AxiosError).response?.status;
        const shouldRetry =
          loadAttemptNumber < MAX_REVIEW_LOAD_ATTEMPTS &&
          (status === 404 || status === 409 || status === 425 || status === 503);

        if (shouldRetry) {
          scheduledRetry = true;
          retryTimer = setTimeout(() => {
            retryTimer = null;
            void loadAttempt(loadAttemptNumber + 1);
          }, REVIEW_LOAD_RETRY_DELAY_MS);
          return;
        }

        setError(getReviewLoadMessage(loadError));
      } finally {
        if (!cancelled && !scheduledRetry) setIsLoading(false);
      }
    };

    if (attemptId) {
      void loadAttempt();
    } else {
      setError('Invalid attempt id.');
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [attemptId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!attempt || error) {
    return (
      <div className="mx-auto flex min-h-[65vh] w-full max-w-3xl items-center justify-center p-4 md:p-8">
        <Card className="w-full border-red-200 bg-red-50 text-red-800">
          <CardContent className="flex items-start gap-3 pt-1">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm md:text-base">{error ?? 'Attempt not found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-10rem)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl">
        <AttemptReviewArena attempt={attempt} />
      </div>
    </main>
  );
}
