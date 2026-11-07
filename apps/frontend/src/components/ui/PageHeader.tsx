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
    <div className="mb-6 flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{localize(title)}</h1>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{localize(description)}</p>
        )}
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}
