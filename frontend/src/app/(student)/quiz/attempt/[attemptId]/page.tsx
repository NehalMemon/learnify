'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { quizApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

interface Question {
  id: string;
  text: string;
  options: string[];
}

interface QuizAttempt {
  id: string;
  category: {
    id: string;
    name: string;
  };
  questions: Question[];
  status: 'IN_PROGRESS' | 'COMPLETED';
  currentQuestionIndex: number;
  score: number;
  totalQuestions: number;
  timeTakenSec: number;
}

function QuizTaker() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        const response = await quizApi.getAttempt(attemptId);
        setAttempt(response.data.data);
      } catch (error) {
        console.error('Error fetching quiz attempt:', error);
        alert('Failed to load quiz. Please try again.');
        router.push('/quiz');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempt();
  }, [attemptId, router]);

  // Timer
  useEffect(() => {
    if (!attempt || attempt.status === 'COMPLETED') return;

    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt]);

  const handleSelectAnswer = (option: string) => {
    setSelectedAnswer(option);
  };

  const handleSubmitAnswer = async () => {
    if (!attempt || !selectedAnswer) return;

    const currentQuestion = attempt.questions[attempt.currentQuestionIndex];
    setIsSubmitting(true);

    try {
      // Submit answer
      await quizApi.submitAnswer(attemptId, {
        questionId: currentQuestion.id,
        selected: selectedAnswer,
      });

      // Move to next question or finish
      if (attempt.currentQuestionIndex < attempt.questions.length - 1) {
        // Update local state to show next question
        setAttempt((prev) =>
          prev
            ? {
                ...prev,
                currentQuestionIndex: prev.currentQuestionIndex + 1,
              }
            : null
        );
        setSelectedAnswer('');
      } else {
        // Finalize quiz
        await quizApi.finalizeQuiz(attemptId, { timeTakenSec: timeElapsed });
        router.push(`/dashboard/quiz/results/${attemptId}`);
      }
    } catch (error: unknown) {
      console.error('Error submitting answer:', error);
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!attempt || attempt.status === 'COMPLETED') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Available</h1>
          <p className="text-gray-600 mb-4">
            This quiz has already been completed or doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push('/quiz')}>Back to Quiz</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = attempt.questions[attempt.currentQuestionIndex];
  const progress = ((attempt.currentQuestionIndex + 1) / attempt.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {attempt.category.name}
              </h1>
              <p className="text-sm text-gray-500">
                Question {attempt.currentQuestionIndex + 1} of {attempt.questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="info">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(timeElapsed)}
              </Badge>
              <Badge variant="success">
                Score: {attempt.score}/{attempt.totalQuestions}
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQuestion.text}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedAnswer === option
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                        selectedAnswer === option
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedAnswer === option && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-900">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer}
            isLoading={isSubmitting}
            size="lg"
          >
            {attempt.currentQuestionIndex < attempt.questions.length - 1
              ? 'Next Question'
              : 'Submit Quiz'}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function QuizAttemptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <QuizTaker />
    </Suspense>
  );
}
