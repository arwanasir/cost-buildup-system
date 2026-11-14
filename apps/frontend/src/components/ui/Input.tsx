import React, { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useUiText } from '@/lib/ui-text';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const localize = useUiText();
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            {localize(label)}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`block min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm shadow-slate-950/[.02] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 ${error ? 'border-red-300' : 'border-slate-200'} ${className}`}
          {...props}
          placeholder={localize(props.placeholder)}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{localize(error)}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
