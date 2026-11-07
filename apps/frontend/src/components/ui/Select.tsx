import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { useUiText } from '@/lib/ui-text';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
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
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {localize(label)}
          </label>
        )}
        <select
          id={id}
          ref={ref}
          className={`block w-full pl-3 pr-10 py-2 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border ${error ? 'border-red-300' : 'border-gray-300'} ${className}`}
          {...props}
        >
          <option value="" disabled>
            <LocalizedText
              text={'\n            Select an option\n          '}
            />
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {localize(opt.label)}
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
