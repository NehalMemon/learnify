'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { quizApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';
import { AttemptReviewArena } from '@/components/quiz/AttemptReviewArena';

type AttemptPayload = {
  id: string;
  userId: string;
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

function unwrap(payload: ApiResponse): AttemptPayload {
  if ('data' in payload && payload.data) return payload.data;
  return payload as AttemptPayload;
}

export default function AdminAttemptReviewPage() {
  const params = useParams();
  const attemptId = String(params.attemptId ?? '');
  const userId = String(params.userId ?? '');
  const [attempt, setAttempt] = useState<AttemptPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAttempt = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await quizApi.getAttempt(attemptId);
        if (cancelled) return;
        const parsed = unwrap(response.data);
        if (parsed.userId && userId && parsed.userId !== userId) {
          setError('This attempt does not belong to the selected user.');
          setAttempt(null);
          return;
        }
        setAttempt(parsed);
      } catch {
        if (!cancelled) setError('Unable to load student exam review.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (attemptId && userId) {
      void loadAttempt();
    } else {
      setError('Invalid review route parameters.');
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [attemptId, userId]);

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
        <Card className="w-full border-red-400/30 bg-red-400/10 text-red-100">
          <CardContent className="flex items-start gap-3 pt-1">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm md:text-base">{error ?? 'Attempt not found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <AttemptReviewArena attempt={attempt} />
      </div>
    </main>
  );
}
