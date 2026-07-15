'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Brain, Loader2, Search, User } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchAutocompleteResults, type SearchResultItem } from '@/lib/search';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 1000;

const typeIcons = {
  course: BookOpen,
  quiz: Brain,
  user: User,
} as const;

interface SearchBarProps {
  variant?: 'student' | 'admin';
  placeholder?: string;
  className?: string;
  /** Pill style for the student header; default is full-width input */
  appearance?: 'default' | 'pill';
}

export function SearchBar({
  variant = 'student',
  placeholder,
  className,
  appearance = 'default',
}: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, DEBOUNCE_MS);
  const isWaitingForDebounce = searchTerm.trim() !== debouncedSearch.trim();

  const resolvedPlaceholder =
    placeholder ??
    (variant === 'admin'
      ? 'Search users, courses, quizzes...'
      : 'Search courses and quizzes...');

  useEffect(() => {
    const trimmed = debouncedSearch.trim();

    if (!trimmed) {
      setResults([]);
      setIsFetching(false);
      return;
    }

    let cancelled = false;

    const loadResults = async () => {
      setIsFetching(true);
      try {
        const items = await fetchAutocompleteResults(trimmed, variant);
        if (!cancelled) {
          setResults(items);
          setIsOpen(true);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setIsOpen(true);
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    };

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, variant]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isOpen && debouncedSearch.trim().length > 0;
  const showSpinner = isWaitingForDebounce;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'relative flex items-center',
          appearance === 'pill'
            ? 'min-h-[44px] rounded-full border border-gray-200 bg-gray-100 px-4'
            : 'w-full'
        )}
      >
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {showSpinner ? (
            <Loader2 className="h-4 w-4 animate-spin text-purple-600" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          )}
        </div>

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            if (event.target.value.trim()) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (debouncedSearch.trim()) {
              setIsOpen(true);
            }
          }}
          placeholder={resolvedPlaceholder}
          aria-label={resolvedPlaceholder}
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          className={cn(
            'w-full border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
            appearance === 'pill'
              ? 'min-h-[44px] w-full max-w-[12rem] border-none bg-transparent focus:ring-0 sm:max-w-xs'
              : 'min-h-[44px] rounded-lg'
          )}
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {isFetching && !isWaitingForDebounce ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              Searching…
            </div>
          ) : results.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
              {results.map((result) => {
                const Icon = typeIcons[result.type];

                return (
                  <li key={`${result.type}-${result.id}`} role="option">
                    <Link
                      href={result.href}
                      onClick={() => {
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{result.title}</p>
                        {result.subtitle && (
                          <p className="truncate text-xs text-gray-500">{result.subtitle}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-gray-500">
              No results found for &lsquo;{debouncedSearch.trim()}&rsquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
