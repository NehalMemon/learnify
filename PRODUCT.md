# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
General Academic Students (University courses, general education) and Administrators managing course content, live workshops, taxonomy, and credit allocation ledgers.

## Product Purpose
Learnify is a dual-division Learning Management System (LMS) designed to deliver a comprehensive video course library, structured module materials, interactive quizzes, and live academic workshops. Success means effortless course navigation, clear progress tracking, low cognitive load, and transparent credit store management.

## Positioning
A comprehensive university & general education LMS combining video course libraries, interactive live workshops, structured progress tracking, and flexible credit-based access models.

## Operating Context
Students access course modules, view materials (notes, videos, quizzes), register for workshops, track personal progress, and top up platform credits. Administrators handle taxonomy, question banks, quiz building, user accounts, and manual payment proof verification.

## Capabilities and Constraints
- Dual-division curriculum (Foundation & MedEd) supporting structured modules and secure materials.
- SaaS Credit Store with admin verification for payment receipt requests.
- Interactive quiz engine with performance scoring and student leaderboards.
- Next.js RSC & Client architecture with Tailwind CSS styling and Supabase PostgreSQL backend.

## Brand Commitments
- Minimalist & clinical visual identity (Ultra-clean monochrome with subtle, high-contrast accents).
- High readability, precise spatial rhythm, and crisp typography.

## Evidence on Hand
- Full Next.js frontend application (`/dashboard`, `/my-courses`, `/workshops`, `/admin/*`).
- Supabase PostgreSQL database schema (`types_db.ts`) and Server Actions (`creditActions.ts`, `creditAdminActions.ts`).

## Product Principles
1. **Uncluttered Focus**: Maintain low cognitive load with clean, monochrome surfaces and deliberate whitespace hierarchy.
2. **Seamless Navigation**: Provide instant visual feedback for course progress, video materials, and credit transactions.
3. **Structured Progression**: Keep learning milestones clear via transparent module dependencies and progress bars.
4. **Reliable Ledger**: Enforce clear admin review workflows and explicit status indicators for platform credit requests.

## Accessibility & Inclusion
- Responsive mobile-first design system.
- High-contrast text readability (WCAG AA compliant).
- Accessible keyboard navigation and ARIA state handling across sidebars, modals, and interactive cards.
