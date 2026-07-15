'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, HelpCircle, CheckSquare, Layers, HelpCircle as TrueFalseIcon, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Mapping question types to nice display text and icons
const QUESTION_TYPE_INFO = {
  SINGLE_CHOICE: {
    label: 'Single Choice',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: HelpCircle,
  },
  TRUE_FALSE: {
    label: 'True/False',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Layers,
  },
  MULTIPLE_SELECT: {
    label: 'Multiple Select',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: CheckSquare,
  },
  MATCHING_PAIRS: {
    label: 'Matching Pairs',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ArrowLeftRight,
  },
} as const;

interface QuizSidebarProps {
  questions: { id: string; type: keyof typeof QUESTION_TYPE_INFO; questionText?: string }[];
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
  append: (value: any) => void;
  remove: (index: number) => void;
}

export function QuizSidebar({
  questions,
  activeIndex,
  setActiveIndex,
  append,
  remove,
}: QuizSidebarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddQuestion = (type: keyof typeof QUESTION_TYPE_INFO) => {
    let defaultValue: any = { type, questionText: '', explanation: '' };

    if (type === 'SINGLE_CHOICE') {
      defaultValue = {
        ...defaultValue,
        options: ['', ''],
        correctOptionIndex: 0,
      };
    } else if (type === 'TRUE_FALSE') {
      defaultValue = {
        ...defaultValue,
        correctAnswer: 'true',
      };
    } else if (type === 'MULTIPLE_SELECT') {
      defaultValue = {
        ...defaultValue,
        options: ['', ''],
        correctOptionIndices: [0],
      };
    } else if (type === 'MATCHING_PAIRS') {
      defaultValue = {
        ...defaultValue,
        pairs: [{ left: '', right: '' }, { left: '', right: '' }],
      };
    }

    append(defaultValue);
    setIsDropdownOpen(false);
    // Set active index to the newly added question (which is at the end of the list)
    setActiveIndex(questions.length);
  };

  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    remove(index);
    if (activeIndex === index) {
      setActiveIndex(null);
    } else if (activeIndex !== null && activeIndex > index) {
      setActiveIndex(activeIndex - 1);
    }
  };

  return (
    <aside className="w-80 border-r border-gray-200 bg-white flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-100 flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Questions ({questions.length})
        </h2>
        
        {/* Add Question Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 mt-2 z-50 rounded-lg border border-gray-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-100">
              {Object.entries(QUESTION_TYPE_INFO).map(([type, info]) => {
                const Icon = info.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddQuestion(type as keyof typeof QUESTION_TYPE_INFO)}
                    className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-md border ${info.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-gray-800">{info.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Questions Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <p className="text-sm text-gray-400">No questions added yet.</p>
            <p className="text-xs text-gray-400/80 mt-1">Use the button above to add your first question.</p>
          </div>
        ) : (
          questions.map((q, idx) => {
            const info = QUESTION_TYPE_INFO[q.type] || {
              label: 'Question',
              color: 'bg-gray-50 text-gray-700 border-gray-200',
              icon: HelpCircle,
            };
            const Icon = info.icon;
            const isActive = activeIndex === idx;

            return (
              <div
                key={q.id}
                onClick={() => setActiveIndex(idx)}
                className={`group relative flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-50/50 border-purple-300 shadow-sm ring-1 ring-purple-100'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
                }`}
              >
                {/* Question Type Icon Badge */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${info.color}`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    Question {idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {q.questionText || <span className="text-gray-400 italic">Untitled Question</span>}
                  </p>
                  <span className="text-[10px] font-medium text-gray-400 block mt-0.5">
                    {info.label}
                  </span>
                </div>

                {/* Delete button (visible on hover) */}
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, idx)}
                  aria-label={`Delete question ${idx + 1}`}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 transition-all duration-150"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
