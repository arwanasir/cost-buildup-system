import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { useUiText } from '@/lib/ui-text';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number; translate?: boolean }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
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
        <select
          id={id}
          ref={ref}
          className={`block min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 text-sm shadow-sm shadow-slate-950/[.02] focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 ${error ? 'border-red-300' : ''} ${className}`}
          {...props}
        >
          <option value="" disabled>
            <LocalizedText
              text={'\n            Select an option\n          '}
            />
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.translate === false ? opt.label : localize(opt.label)}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-600">{localize(error)}</p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
