'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { coursesApi, enrollmentsApi, getUser } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, PlayCircle, FileText } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  division?: { name: string; slug: string };
  category?: string;
  type?: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Material {
  id: string;
  title: string;
  type: string;
  order: number;
  isCompleted?: boolean;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  materials?: Material[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const user = getUser();

  useEffect(() => {
    let cancelled = false;
    const fetchCourse = async () => {
      try {
        const courseRes = await coursesApi.getCourse(courseId);
        if (!cancelled) setCourse(courseRes.data.data);

        if (user) {
          try {
            const enrollmentsRes = await enrollmentsApi.getMyEnrollments();
            const enrollments = enrollmentsRes.data.data || [];
            const enrolled = enrollments.some(
              (e: { course: { id: string } }) => e.course.id === courseId
            );
            if (!cancelled) setIsEnrolled(enrolled);

            if (enrolled) {
              const modulesRes = await coursesApi.getCourseModules(courseId);
              if (!cancelled) setModules(modulesRes.data.data || []);
            }
          } catch {
            // Silently handle enrollment check failure — not a critical error
          }
        }
      } catch {
        // Course fetch failure resolved via empty state below
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchCourse();
    return () => { cancelled = true; };
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnroll = async () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${courseId}`);
      return;
    }
    setIsEnrolling(true);
    try {
      await enrollmentsApi.createEnrollment({ courseId });
      setIsEnrolled(true);
      const modulesRes = await coursesApi.getCourseModules(courseId);
      setModules(modulesRes.data.data || []);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(message || 'Failed to enroll. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-8 text-center">
        <div>
          <BookOpen className="mx-auto mb-4 size-16 text-muted-foreground opacity-40" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Course Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The course you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/dashboard/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header Card */}
            <div className="bg-card rounded-md border border-border overflow-hidden shadow-sm">
              {course.thumbnailUrl ? (
                <div className="relative h-64 bg-muted">
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 66vw, 100vw"
                  />
                </div>
              ) : (
                <div className="h-64 bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-24 h-24 text-primary/30" />
                </div>
              )}

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {course.division && <Badge variant="info">{course.division.name}</Badge>}
                  {course.category && <Badge variant="purple">{course.category}</Badge>}
                  {course.type && <Badge variant="success">{course.type}</Badge>}
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">{course.title}</h1>
                <p className="text-muted-foreground leading-relaxed mb-4">{course.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Instructor</p>
                    <p className="font-semibold text-foreground">{course.instructor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-semibold text-foreground">
                      {new Date(course.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Content (enrolled only) */}
            {isEnrolled && modules.length > 0 && (
              <div className="bg-card rounded-md border border-border p-6 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-5">Course Content</h2>
                <div className="space-y-3">
                  {modules.map((module) => (
                    <div key={module.id} className="border border-border rounded-md overflow-hidden">
                      <button
                        onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                        className="w-full px-4 py-3 bg-muted flex items-center justify-between hover:bg-muted/70 transition-colors text-left min-h-[48px]"
                      >
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">
                            Module {module.order}: {module.title}
                          </h3>
                          {module.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{module.description}</p>
                          )}
                        </div>
                        {expandedModule === module.id
                          ? <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                        }
                      </button>

                      {expandedModule === module.id && module.materials && (
                        <div className="divide-y divide-border">
                          {module.materials.map((material) => (
                            <Link
                              key={material.id}
                              href={`/courses/${courseId}/learn?material=${material.id}`}
                              prefetch={false}
                              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {material.type === 'VIDEO'
                                  ? <PlayCircle className="size-4 text-primary shrink-0" />
                                  : <FileText className="size-4 text-muted-foreground shrink-0" />
                                }
                                <span className="text-sm font-medium text-foreground">{material.title}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{material.type}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enrollment Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-md border border-border p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-foreground mb-4">Course Enrollment</h2>

              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800 font-medium">
                    <CheckCircle2 className="size-4 shrink-0" />
                    You are enrolled in this course
                  </div>
                  <Link href={`/courses/${courseId}/learn`} className="block">
                    <Button className="w-full min-h-[44px]">Start Learning</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enroll now to get access to all course materials, modules, and resources.
                  </p>
                  <Button
                    onClick={handleEnroll}
                    isLoading={isEnrolling}
                    className="w-full min-h-[44px]"
                  >
                    {user ? 'Enroll Now' : 'Login to Enroll'}
                  </Button>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3 text-sm">This course includes:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    {modules.length} Modules
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    {modules.reduce((acc, m) => acc + (m.materials?.length || 0), 0)} Learning Materials
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    Lifetime Access
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
