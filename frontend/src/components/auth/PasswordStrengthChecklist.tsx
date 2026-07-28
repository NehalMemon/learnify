'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { passwordRequirements } from '@/lib/validations/auth';

interface PasswordStrengthChecklistProps {
  password: string;
}

export function PasswordStrengthChecklist({ password }: PasswordStrengthChecklistProps) {
  return (
    <div className="mt-2 rounded-lg border border-[#006c49]/10 bg-[#6cf8bb]/10 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00714d]">
        Security Checklist
      </p>
      <ul className="space-y-1.5" aria-live="polite" aria-label="Password requirements">
        {passwordRequirements.map((requirement) => {
          const met = requirement.test(password);

          return (
            <li
              key={requirement.key}
              className={`flex items-center gap-2 text-xs transition-colors ${
                met ? 'text-[#00714d]' : 'text-[#5b5a68]/70'
              }`}
            >
              {met ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{requirement.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
