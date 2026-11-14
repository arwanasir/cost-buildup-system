import React from 'react';
import { useUiText } from '@/lib/ui-text';

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const localize = useUiText();
  return (
    <div className="page-header mb-7 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,.045)] sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-800">
          {localize('Import operations')}
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-[-.035em] text-slate-900 sm:text-[30px]">
          {localize(title)}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {localize(description)}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
