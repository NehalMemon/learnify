'use client';

import { Check, Circle } from 'lucide-react';
import { passwordRequirements } from '@/lib/validations/auth';

interface PasswordStrengthChecklistProps {
  password: string;
}

export function PasswordStrengthChecklist({ password }: PasswordStrengthChecklistProps) {
  return (
    <ul className="mt-2 space-y-1.5" aria-live="polite" aria-label="Password requirements">
      {passwordRequirements.map((requirement) => {
        const met = requirement.test(password);

        return (
          <li
            key={requirement.key}
            className={`flex items-center gap-2 text-sm transition-colors ${
              met ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            {met ? (
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            <span>{requirement.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
