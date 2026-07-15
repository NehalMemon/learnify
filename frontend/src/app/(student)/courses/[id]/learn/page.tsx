'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { coursesApi, progressApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Material {
  id: string;
  title: string;
  type: 'VIDEO' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
  contentUrl?: string;
  order: number;
  isCompleted?: boolean;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  materials: Material[];
}

function CourseContentViewer() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const initialMaterialId = searchParams.get('material');

  const [modules, setModules] = useState<Module[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const modulesRes = await coursesApi.getCourseModules(courseId);
        const fetchedModules: Module[] = modulesRes.data.data || [];
        setModules(fetchedModules);

        // Find initial material
        let targetMaterial: Material | null = null;
        let targetModule: Module | null = null;

        if (initialMaterialId) {
          for (const courseModule of fetchedModules) {
            const material = courseModule.materials.find((m) => m.id === initialMaterialId);
            if (material) {
              targetMaterial = material;
              targetModule = courseModule;
              break;
            }
          }
        }

        // If no material specified or not found, get first material
        if (!targetMaterial && fetchedModules.length > 0) {
          targetModule = fetchedModules[0];
          targetMaterial = targetModule.materials[0];
        }

        setCurrentMaterial(targetMaterial);
        setCurrentModule(targetModule);
      } catch (error) {
        console.error('Error fetching course content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [courseId, initialMaterialId]);

  const handleCompleteMaterial = async () => {
    if (!currentMaterial) return;

    setIsCompleting(true);
    try {
      await progressApi.completeMaterial(currentMaterial.id);
      // Update local state to mark as completed
      setModules((prev) =>
        prev.map((module) => ({
          ...module,
          materials: module.materials.map((m) =>
            m.id === currentMaterial.id ? { ...m, isCompleted: true } : m
          ),
        }))
      );
      setCurrentMaterial((prev) => prev ? { ...prev, isCompleted: true } : null);
    } catch (error) {
      console.error('Error marking material as complete:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const navigateToMaterial = (material: Material) => {
    router.push(`/courses/${courseId}/learn?material=${material.id}`);
    setCurrentMaterial(material);
  };

  const getNextMaterial = (): Material | null => {
    if (!currentModule || !currentMaterial) return null;

    const currentIndex = currentModule.materials.findIndex(
      (m) => m.id === currentMaterial.id
    );

    if (currentIndex < currentModule.materials.length - 1) {
      return currentModule.materials[currentIndex + 1];
    }

    // Try to get first material of next module
    const currentModuleIndex = modules.findIndex((m) => m.id === currentModule.id);
    if (currentModuleIndex < modules.length - 1) {
      const nextModule = modules[currentModuleIndex + 1];
      return nextModule.materials[0];
    }

    return null;
  };

  const getPreviousMaterial = (): Material | null => {
    if (!currentModule || !currentMaterial) return null;

    const currentIndex = currentModule.materials.findIndex(
      (m) => m.id === currentMaterial.id
    );

    if (currentIndex > 0) {
      return currentModule.materials[currentIndex - 1];
    }

    // Try to get last material of previous module
    const currentModuleIndex = modules.findIndex((m) => m.id === currentModule.id);
    if (currentModuleIndex > 0) {
      const prevModule = modules[currentModuleIndex - 1];
      return prevModule.materials[prevModule.materials.length - 1];
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentMaterial || !currentModule) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No Content Available
        </h2>
        <p className="text-gray-600 mb-4">
          This course doesn&apos;t have any learning materials yet.
        </p>
        <Link href={`/courses/${courseId}`}>
          <Button>Back to Course</Button>
        </Link>
      </div>
    );
  }

  const nextMaterial = getNextMaterial();
  const prevMaterial = getPreviousMaterial();

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Module Navigation */}
      <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <Link
            href={`/courses/${courseId}`}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Course</span>
          </Link>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Course Content</h3>
          <div className="space-y-4">
            {modules.map((module) => (
              <div key={module.id}>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Module {module.order}: {module.title}
                </h4>
                <div className="space-y-1">
                  {module.materials.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => navigateToMaterial(material)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        material.id === currentMaterial.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {material.type === 'VIDEO' ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : material.type === 'PDF' ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <span>{material.title}</span>
                      </div>
                      {material.isCompleted && (
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="info">Module {currentModule.order}</Badge>
              <Badge variant={currentMaterial.isCompleted ? 'success' : 'default'}>
                {currentMaterial.isCompleted ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{currentMaterial.title}</h1>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            {currentMaterial.type === 'VIDEO' && currentMaterial.contentUrl && (
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  src={currentMaterial.contentUrl}
                  controls
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {currentMaterial.type === 'PDF' && currentMaterial.contentUrl && (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <iframe
                  src={currentMaterial.contentUrl}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              </div>
            )}

            {currentMaterial.type === 'QUIZ' && (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-purple-600 mx-auto mb-4"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Quiz Available
                </h3>
                <p className="text-gray-600 mb-4">
                  Test your knowledge with this quiz
                </p>
                <Button onClick={() => router.push(`/quiz`)}>
                  Start Quiz
                </Button>
              </div>
            )}

            {currentMaterial.type === 'ASSIGNMENT' && (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-blue-600 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Assignment
                </h3>
                <p className="text-gray-600">
                  Assignment content will be displayed here
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {prevMaterial ? (
              <Button
                variant="outline"
                onClick={() => navigateToMaterial(prevMaterial)}
              >
                ← Previous
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-4">
              {!currentMaterial.isCompleted && (
                <Button
                  variant="primary"
                  onClick={handleCompleteMaterial}
                  isLoading={isCompleting}
                >
                  Mark as Complete
                </Button>
              )}

              {nextMaterial ? (
                <Button onClick={() => navigateToMaterial(nextMaterial)}>
                  Next →
                </Button>
              ) : (
                <Link href={`/courses/${courseId}`}>
                  <Button variant="outline">Back to Course</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CourseLearnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <CourseContentViewer />
    </Suspense>
  );
}
