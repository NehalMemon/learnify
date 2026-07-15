'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { enrollmentsApi } from '@/lib/api';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen } from 'lucide-react';

interface Enrollment {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
  progressPercentage: number;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'purple' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  COMPLETED: 'purple',
  CANCELLED: 'danger',
};

const CourseSkeleton = () => (
  <Card className="border-border bg-card overflow-hidden rounded-md shadow-sm">
    <CardContent className="p-0 flex flex-col h-full">
      <div className="w-full h-40 bg-muted animate-pulse" />
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-3" />
        <div className="w-full bg-muted/50 rounded-full h-2 mb-4">
          <div className="bg-muted h-2 rounded-full animate-pulse w-1/3" />
        </div>
        <div className="h-11 w-full bg-muted rounded animate-pulse mt-auto" />
      </div>
    </CardContent>
  </Card>
);

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchEnrollments = async () => {
      try {
        const response = await enrollmentsApi.getMyEnrollments();
        if (!cancelled) setEnrollments(response.data.data || []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchEnrollments();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background p-4 text-foreground md:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
          <p className="mt-1 text-muted-foreground">View and continue your enrolled courses</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseSkeleton key={i} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
        <p className="mt-1 text-muted-foreground">View and continue your enrolled courses</p>
      </div>

      {/* Empty State */}
      {enrollments.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/50 p-16 text-center">
          <BookOpen className="mx-auto mb-3 size-12 text-muted-foreground opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No enrollments yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Browse our courses and start learning today</p>
          <Link href="/dashboard/courses" className="mt-4 inline-block">
            <Button className="mt-4">Browse Courses</Button>
          </Link>
        </div>
      )}

      {/* Courses Grid */}
      {enrollments.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id} className="border-border bg-card overflow-hidden rounded-md shadow-sm hover:shadow-sm transition-shadow">
              <CardContent className="p-0">
                {enrollment.course.thumbnailUrl ? (
                  <div className="relative h-40 bg-muted">
                    <Image
                      src={enrollment.course.thumbnailUrl}
                      alt={enrollment.course.title}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-primary/40" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={STATUS_VARIANT[enrollment.status] ?? 'warning'}>
                      {enrollment.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {enrollment.progressPercentage}% complete
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-foreground mb-3 line-clamp-2">
                    {enrollment.course.title}
                  </h3>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2 mb-4">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${enrollment.progressPercentage}%` }}
                    />
                  </div>

                  <Link href={`/courses/${enrollment.course.id}/learn`} className="block">
                    <Button className="w-full min-h-[44px]">
                      {enrollment.progressPercentage > 0 ? 'Continue Learning' : 'Start Learning'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
