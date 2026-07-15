'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, BookOpen } from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
}

const navLinks: NavLink[] = [
  { label: 'Courses', href: '#courses' },
  { label: 'DoctorsQuizz', href: '#doctorsquizz' },
  { label: 'Live Classes', href: '#live-classes' },
];

export default function Navbar(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = (): void => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2 text-xl font-bold text-gray-900 transition-colors duration-200 hover:text-purple-600"
          >
            <div className="rounded-lg bg-purple-600 p-2 transition-colors group-hover:bg-purple-700">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span>Learnify</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="group relative text-sm font-medium text-gray-600 transition-colors duration-200 hover:text-purple-600"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-purple-600 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="btn-secondary px-6 py-2.5 text-sm">
              Log In
            </Link>
            <Link href="/register" className="btn-primary px-6 py-2.5 text-sm">
              Sign Up
            </Link>
          </div>

          <button
            onClick={toggleMenu}
            className="rounded-lg p-2 transition-colors duration-200 hover:bg-gray-100 md:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="h-6 w-6 text-gray-900" strokeWidth={2} />
            ) : (
              <Menu className="h-6 w-6 text-gray-900" strokeWidth={2} />
            )}
          </button>
        </div>

        {isOpen && (
          <div className="space-y-3 border-t border-gray-200 pb-4 md:hidden">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-purple-600"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link
                href="/login"
                className="btn-secondary flex-1 px-4 py-2.5 text-center text-sm"
                onClick={() => setIsOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="btn-primary flex-1 px-4 py-2.5 text-center text-sm"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
