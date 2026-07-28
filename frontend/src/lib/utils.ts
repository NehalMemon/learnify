import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractErrorMessage(
  err: unknown,
  fallback = 'An unexpected error occurred during signup.'
): string {
  if (!err) return fallback;

  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[object Object]') {
      return fallback;
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractErrorMessage(parsed, fallback);
      } catch {
        // Not valid JSON
      }
    }
    return trimmed;
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const candidate = obj.message || obj.error || obj.error_description || obj.msg || obj.details;

    if (candidate && candidate !== err) {
      return extractErrorMessage(candidate, fallback);
    }
  }

  return fallback;
}
