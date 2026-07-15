'use client';

import Link from 'next/link';
import { LucideIcon, User } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface StudentSidebarProps {
  navLinks: NavLink[];
  activePath: string;
}

export function StudentSidebar({ navLinks, activePath }: StudentSidebarProps) {
  return (
    <aside className="relative hidden h-screen w-64 flex-col bg-[#151b2a] text-[#f0ebd8] md:flex">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1321]/40 via-transparent to-[#0d1321]/60" />
      <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-transparent via-[#b0c8ea]/25 to-transparent" />

      <div className="relative z-10 flex flex-1 flex-col px-5 py-7 gap-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#f0ebd8]/50">Learnify</p>
            <h1 className="text-2xl font-semibold text-[#f0ebd8]">Student</h1>
          </div>
          <div className="size-10 rounded-full bg-gradient-to-br from-[#b0c8ea]/80 to-[#7b93b2]/80 shadow-[0_20px_50px_-25px_rgba(176,200,234,0.65)]" />
        </div>

        <nav className="space-y-2.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = activePath === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-br from-[#b0c8ea] to-[#7b93b2] text-[#001d36] shadow-[0_30px_80px_-60px_rgba(176,200,234,0.65)]'
                    : 'bg-[#1c2233] text-[#f0ebd8]/75 hover:bg-[#242a39] hover:text-[#f0ebd8]'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="flex-1 font-medium tracking-tight">{link.label}</span>
                <span
                  className={`size-2 rounded-full transition-opacity duration-200 ${
                    active ? 'bg-[#001d36] opacity-100' : 'bg-[#b0c8ea]/60 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 rounded-2xl bg-[#1c2233]/80 p-4 backdrop-blur-xl shadow-[0_30px_80px_-60px_rgba(176,200,234,0.5)]">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-[#7b93b2]/30 text-sm font-semibold text-[#f0ebd8]">
              <User className="h-5 w-5 text-[#b0c8ea]" strokeWidth={1.5} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-[#f0ebd8]">You</p>
              <p className="text-xs text-[#f0ebd8]/60">student@learnify.pk</p>
            </div>
          </div>
          <div className="rounded-xl bg-[#0d1321]/60 px-4 py-3 text-xs text-[#f0ebd8]/65">
            <p className="font-medium text-[#f0ebd8]">The Submerged Archive</p>
            <p className="mt-1 leading-relaxed">
              Dense, editorial workspace tuned for deep study. No lines—only layered light.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}