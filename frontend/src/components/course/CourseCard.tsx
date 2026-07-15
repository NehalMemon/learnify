 'use client'

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, BookOpen } from 'lucide-react';
import type { ViewMode } from '@/hooks/useViewMode';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  division?: {
    name: string;
    slug: string;
  };
  category?: string;
  type?: string;
  thumbnailUrl?: string;
  price?: number;
  isPublished: boolean;
}

interface CourseCardProps {
  course: Course;
  isFavorited?: boolean;
  viewMode?: ViewMode;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, isFavorited = false, viewMode = 'grid' }) => {
  const [isFavoritedState, setIsFavoritedState] = useState<boolean>(Boolean(isFavorited));

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const previousState = isFavoritedState;
    setIsFavoritedState(!previousState);

    try {
      const res = await fetch('/api/v1/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId: course.id, itemType: 'COURSE' }),
      });

      if (!res.ok) {
        setIsFavoritedState(previousState);
      }
    } catch (err) {
      setIsFavoritedState(previousState);
    }
  };

  const FavoriteButton = () => (
    <button
      onClick={handleToggleFavorite}
      aria-pressed={isFavoritedState}
      aria-label="Toggle Favorite"
      className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition-colors hover:bg-white"
    >
      {isFavoritedState ? (
        <Heart className="h-4 w-4 fill-current text-red-500" />
      ) : (
        <Heart className="h-4 w-4 text-gray-400" />
      )}
    </button>
  );

  // ── List layout ──────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className="group flex flex-row items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5">
        {/* Compact thumbnail */}
        {course.thumbnailUrl ? (
          <div className="relative h-28 w-36 shrink-0 bg-gray-100 sm:w-44">
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              unoptimized
              sizes="176px"
              className="object-cover"
            />
            <FavoriteButton />
          </div>
        ) : (
          <div className="relative flex h-28 w-36 shrink-0 items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 sm:w-44">
            <BookOpen className="h-8 w-8 text-purple-200" />
            <FavoriteButton />
          </div>
        )}

        {/* Content — stretches horizontally */}
        <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            {course.division && (
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                {course.division.name}
              </span>
            )}
            <h3 className="text-base font-bold leading-tight text-gray-900 line-clamp-1">
              {course.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-sm text-gray-600">
              {course.description}
            </p>

            {/* Meta Tags */}
            <div className="mt-2 flex items-center gap-2 overflow-hidden whitespace-nowrap">
              {course.category && (
                <span className="inline-block max-w-[120px] truncate rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {course.category}
                </span>
              )}
              {course.type && (
                <span className="inline-block max-w-[120px] truncate rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {course.type}
                </span>
              )}
            </div>
          </div>

          {/* CTA button — fixed width on the right */}
          <div className="shrink-0">
            <div className="rounded-lg bg-purple-50 px-5 py-2.5 text-center text-sm font-semibold text-purple-700 transition-colors duration-300 group-hover:bg-purple-600 group-hover:text-white">
              View Course
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Grid layout (default) ────────────────────────────────────
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-purple-200 hover:shadow-md hover:-translate-y-1">
      {/* Cover Image */}
      {course.thumbnailUrl ? (
        <div className="relative h-40 w-full bg-gray-100">
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <FavoriteButton />
        </div>
      ) : (
        <div className="relative flex h-40 w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
          <BookOpen className="h-12 w-12 text-purple-200" />
          <FavoriteButton />
        </div>
      )}

      {/* Content Wrapper - flex-grow ensures it expands */}
      <div className="flex flex-grow flex-col p-5">
        {/* Category/Division */}
        <div className="mb-1">
          {course.division && (
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
              {course.division.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-bold leading-tight text-gray-900 line-clamp-2">
          {course.title}
        </h3>

        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-grow text-sm text-gray-600">
          {course.description}
        </p>

        {/* Meta Tags - LOCKED: Single line, no wrap */}
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap mt-3">
          {course.category && (
            <span className="inline-block max-w-[120px] truncate px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
              {course.category}
            </span>
          )}
          {course.type && (
            <span className="inline-block max-w-[120px] truncate px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
              {course.type}
            </span>
          )}
        </div>
      </div>

      {/* Action Area - LOCKED: mt-auto anchors to bottom */}
      <div className="mt-auto pt-4 border-t border-gray-100 w-full px-5 pb-5">
        {course.price !== undefined && course.price > 0 && (
          <p className="mb-2 text-xs font-medium text-gray-400 text-right">
            PKR {course.price.toLocaleString()}
          </p>
        )}
        <div className="block w-full rounded-lg bg-purple-50 py-2.5 text-center text-sm font-semibold text-purple-700 transition-colors duration-300 group-hover:bg-purple-600 group-hover:text-white">
          View Course
        </div>
      </div>
    </div>
  );
};
