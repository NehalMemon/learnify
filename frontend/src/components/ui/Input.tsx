import React, { forwardRef, InputHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const inputBaseClasses =
  'min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 transition-colors';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const sanitizedId = generatedId.replace(/:/g, '');
    const inputId = id || `input-${sanitizedId}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const describedBy = [
      error ? errorId : null,
      helperText && !error ? helperId : null,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-gray-800"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${inputBaseClasses} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs font-semibold text-red-600">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-xs font-medium text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
