import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost'
    | 'success'
    | 'warning'
    | 'outline';
}

export function Button({
  isLoading,
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyle =
    'app-button inline-flex min-h-11 justify-center items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold tracking-[.005em] transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px';

  const variants = {
    primary:
      'border-transparent text-white bg-sky-700 hover:bg-sky-800 focus:ring-sky-600 shadow-sm',
    secondary:
      'app-button-secondary border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-sky-500 shadow-sm',
    danger:
      'border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
    success:
      'border-transparent text-white bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-500',
    warning:
      'border-transparent text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    outline:
      'app-button-secondary border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-sky-500 shadow-sm',
    ghost:
      'border-transparent text-gray-700 bg-transparent hover:bg-gray-100 focus:ring-gray-500 shadow-none',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}
