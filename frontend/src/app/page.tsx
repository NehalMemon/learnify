'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Activity,
  ArrowRight,
  Users,
  Zap,
  BarChart3,
  Target,
  Award,
  Clock,
  Globe,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

interface StatItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface DivisionCard {
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  gradient: string;
  accentColor: string;
}

const stats: StatItem[] = [
  {
    value: '10,000+',
    label: 'Active Students',
    icon: <Users className="w-5 h-5 text-blue-600" strokeWidth={2} />,
  },
  {
    value: '500+',
    label: 'Video Lectures',
    icon: <BookOpen className="w-5 h-5 text-blue-600" strokeWidth={2} />,
  },
  {
    value: '15,000+',
    label: 'Practice Questions',
    icon: <Target className="w-5 h-5 text-blue-600" strokeWidth={2} />,
  },
  {
    value: '24/7',
    label: 'Live Support',
    icon: <Globe className="w-5 h-5 text-blue-600" strokeWidth={2} />,
  },
];

const divisions: DivisionCard[] = [
  {
    title: 'Learnify Foundation',
    description:
      'Comprehensive O/A Levels preparation with structured curriculum and expert guidance.',
    features: [
      'Recorded Expert Lectures',
      'Interactive Grade Sheets',
      'Subject-wise Syllabus Coverage',
      'Regular Assessments',
      'Progress Tracking',
      'Expert Q&A Community',
    ],
    icon: <BookOpen className="w-8 h-8" strokeWidth={1.5} />,
    gradient: 'from-blue-50 to-cyan-50',
    accentColor: 'bg-blue-600',
  },
  {
    title: 'Learnify MedEd',
    description:
      'Advanced medical education platform featuring DoctorsQuizz engine with real-time competition and mock exams.',
    features: [
      'DoctorsQuizz Engine',
      'Real-time Leaderboards',
      'Medical Mock Exams',
      'Peer Competition',
      'Expert Analytics',
      'Board-style Questions',
    ],
    icon: <Activity className="w-8 h-8" strokeWidth={1.5} />,
    gradient: 'from-purple-50 to-pink-50',
    accentColor: 'bg-purple-600',
  },
];

export default function LandingPage(): React.ReactElement {
  const router = useRouter();
  const [quickEmail, setQuickEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleQuickStart = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!quickEmail.trim()) return;

    setIsSubmitting(true);
    try {
      // Route to the register page and pre-fill the email via URL parameters
      router.push(`/register?email=${encodeURIComponent(quickEmail)}`);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-6 lg:px-8 py-24 sm:py-32 bg-gradient-to-b from-blue-50/50 via-white to-white overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10" />

        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/60 border border-blue-200/80 backdrop-blur-sm mb-8 hover:bg-blue-100/80 transition-colors duration-200">
            <Zap className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
            <span className="text-sm font-medium text-blue-700">
              Now with real-time DoctorsQuizz competition
            </span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-gray-900 mb-8">
            Master Your Future{' '}
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              with Learnify
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl leading-8 text-gray-600 max-w-3xl mx-auto mb-12">
            The ultimate dual-division learning platform. Whether you're building your foundation in
            O/A Levels or preparing for medical boards with our real-time{' '}
            <span className="font-semibold text-blue-600">DoctorsQuizz engine</span> — your complete
            learning ecosystem awaits.
          </p>

          {/* API-Connected Quick Start Form */}
          <form
            onSubmit={handleQuickStart}
            className="max-w-lg mx-auto flex flex-col sm:flex-row gap-3 mb-10"
          >
            <input
              type="email"
              required
              disabled={isSubmitting}
              className="flex-auto rounded-lg border border-gray-300 px-5 py-4 text-base text-gray-900 shadow-sm ring-0 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your email address"
              value={quickEmail}
              onChange={(e) => setQuickEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-none px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-sm hover:shadow-blue-600/30 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSubmitting ? 'Starting...' : 'Get Started'}
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </form>

          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200">
              Log in here
            </Link>
          </p>
        </div>
      </section>

      {/* Divisions Feature Cards Section */}
      <section id="divisions" className="px-6 lg:px-8 py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Choose Your Learning Path
            </h2>
            <p className="text-lg text-gray-600">
              Tailored solutions for every educational journey
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {divisions.map((division, idx) => (
              <div
                key={idx}
                className={`relative rounded-2xl bg-gradient-to-br ${division.gradient} border border-gray-200/50 p-8 sm:p-10 hover:shadow-sm transition-all duration-300 group overflow-hidden`}
              >
                {/* Background accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-opacity-20 rounded-full filter blur-2xl -z-10 group-hover:scale-125 transition-transform duration-300" />

                <div className="flex items-start justify-between mb-6">
                  <div className={`p-3 rounded-xl ${division.accentColor} text-white shadow-sm group-hover:shadow-sm group-hover:scale-110 transition-all duration-300`}>
                    {division.icon}
                  </div>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                  {division.title}
                </h3>

                <p className="text-gray-600 leading-relaxed mb-8">
                  {division.description}
                </p>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  {division.features.map((feature, featureIdx) => (
                    <div key={featureIdx} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${division.accentColor}`} />
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Link
                  href="/register"
                  className={`inline-flex items-center gap-2 px-6 py-3 font-semibold text-white rounded-lg shadow-sm transition-all duration-200 group/btn ${
                    division.accentColor
                  } hover:shadow-sm hover:scale-105 active:scale-95`}
                >
                  Explore {division.title.split(' ')[1]}
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Stats Banner Section */}
      <section className="px-6 lg:px-8 py-20 sm:py-28 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-lg text-blue-100">
              Join a thriving community of learners achieving their goals
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="text-center p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all duration-200 group"
              >
                <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <div className="p-3 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors duration-200">
                    {React.cloneElement(stat.icon as React.ReactElement, {
                      className: 'w-6 h-6 text-white',
                    })}
                  </div>
                </div>
                <div className="text-3xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-blue-100 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 lg:px-8 py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-8">
            Ready to transform your learning?
          </h2>

          <p className="text-lg text-gray-600 mb-12 leading-relaxed">
            Join thousands of students who are already mastering their subjects with Learnify. Start your
            journey today with a free account.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" strokeWidth={2} />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all duration-200 flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-8 py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" strokeWidth={2} />
              <span className="font-semibold text-gray-900">Learnify</span>
            </div>
            <div className="flex gap-8">
              <Link href="#" className="hover:text-gray-900 transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-gray-900 transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-gray-900 transition-colors duration-200">
                Contact Us
              </Link>
            </div>
            <p className="text-gray-500">© 2026 Learnify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
