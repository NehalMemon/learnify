'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { quizApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface QuizCategory {
  id: string;
  name: string;
  questionCount?: number;
}

interface QuizAttempt {
  id: string;
  category: {
    id: string;
    name: string;
  };
  score: number;
  totalQuestions: number;
  timeTakenSec: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
}

export default function QuizPage() {
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, attemptsRes] = await Promise.all([
          quizApi.getCategories(),
          quizApi.getMyAttempts(),
        ]);

        setCategories(categoriesRes.data.data || []);
        setAttempts(attemptsRes.data.data?.attempts || []);
      } catch (error) {
        console.error('Error fetching quiz data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStartQuiz = async (categoryId: string) => {
    try {
      const response = await quizApi.startQuiz({ categoryId, count: 10 });
      const attemptId = response.data.data.id;
      window.location.href = `/quiz/attempt/${attemptId}`;
    } catch (error: unknown) {
      console.error('Error starting quiz:', error);
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(message || 'Failed to start quiz. Please try again.');
    }
  };

  const completedAttempts = Array.isArray(attempts) ? attempts.filter((a) => a.status === 'COMPLETED') : [];
  const inProgressAttempts = Array.isArray(attempts) ? attempts.filter((a) => a.status === 'IN_PROGRESS') : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1321]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-[#0d1321] min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#f0ebd8] mb-2">Quiz Arena</h1>
        <p className="text-[#f0ebd8]/75">
          Test your knowledge, compete with others, and track your progress!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-4 bg-[#3e5c76]/40 rounded-xl">
            <div className="text-2xl font-bold text-[#748cab]">
              {completedAttempts.length}
            </div>
            <div className="text-sm text-[#f0ebd8]/75">Quizzes Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 bg-[#3e5c76]/40 rounded-xl">
            <div className="text-2xl font-bold text-[#748cab]">
              {completedAttempts.length > 0
                ? Math.round(
                    (completedAttempts.reduce((acc, a) => acc + a.score, 0) /
                      (completedAttempts.reduce((acc, a) => acc + a.totalQuestions, 0)) *
                      100)
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-[#f0ebd8]/75">Average Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 bg-[#3e5c76]/40 rounded-xl">
            <div className="text-2xl font-bold text-[#748cab]">
              {inProgressAttempts.length}
            </div>
            <div className="text-sm text-[#f0ebd8]/75">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 bg-[#3e5c76]/40 rounded-xl">
            <div className="text-2xl font-bold text-[#748cab]">
              {categories.length}
            </div>
            <div className="text-sm text-[#f0ebd8]/75">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* In Progress Quizzes */}
      {inProgressAttempts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#f0ebd8] mb-4">
            Continue Your Quizzes
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgressAttempts.map((attempt) => (
              <Card key={attempt.id}>
                <CardContent className="p-4 bg-[#3e5c76]/40 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="warning">In Progress</Badge>
                    <span className="text-xs text-[#f0ebd8]/50">
                      {new Date(attempt.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#f0ebd8] mb-2">
                    {attempt.category.name}
                  </h3>
                  <p className="text-sm text-[#f0ebd8]/75 mb-4">
                    {attempt.score} / {attempt.totalQuestions} correct
                  </p>
                  <Link href={`/quiz/${attempt.id}`} className="block">
                    <Button className="w-full">Continue Quiz</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Categories */}
      <div>
        <h2 className="text-xl font-bold text-[#f0ebd8] mb-4">
          Quiz Categories
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-6 bg-[#3e5c76]/40 rounded-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#748cab]/20 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#748cab]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  {category.questionCount && (
                    <Badge variant="info">{category.questionCount} questions</Badge>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-[#f0ebd8] mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-[#f0ebd8]/75 mb-4">
                  Challenge yourself with our {category.name.toLowerCase()} quiz
                </p>
                <Button
                  onClick={() => handleStartQuiz(category.id)}
                  className="w-full bg-[#748cab] hover:bg-[#748cab]/90 text-[#0d1321]"
                >
                  Start Quiz
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Leaderboard Link */}
      <div className="mt-8 bg-[#748cab]/20 rounded-xl p-6 border border-[#748cab]/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#f0ebd8] mb-2">Compete with Others</h2>
            <p className="text-[#f0ebd8]/75">
              Check the leaderboard to see how you rank against other students
            </p>
          </div>
          <Link href="/dashboard/leaderboard">
            <Button variant="outline" className="border-[#748cab] text-[#748cab] hover:bg-[#748cab]/10">
              View Leaderboard →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
