import React, { useState, useRef, useEffect, useId } from 'react';

interface ComboboxProps {
  label?: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  onInputChange?: (query: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function Combobox({
  label,
  options,
  value,
  onChange,
  onInputChange,
  error,
  placeholder,
  disabled = false,
}: ComboboxProps) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions =
    query === ''
      ? options
      : options.filter((opt) =>
          opt.label.toLowerCase().includes(query.toLowerCase()),
        );

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      )
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${error ? 'border-red-300' : 'border-gray-300'}`}
        placeholder={placeholder}
        value={isOpen ? query : selectedOption?.label || ''}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          const exactOption = options.find(
            (opt) => opt.value === val || opt.label === val,
          );
          if (exactOption) onChange(exactOption.value);
          if (onInputChange) onInputChange(val);
          setIsOpen(true);
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      />
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredOptions.map((opt) => (
            <li
              key={opt.value}
              className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-blue-600 hover:text-white"
              onClick={() => {
                onChange(opt.value);
                setQuery('');
                setIsOpen(false);
              }}
            >
              <span className="block truncate">{opt.label}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
