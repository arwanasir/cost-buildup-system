import React from 'react';

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`app-card rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,.045)] ${className}`}
    >
      {children}
    </div>
  );
}
