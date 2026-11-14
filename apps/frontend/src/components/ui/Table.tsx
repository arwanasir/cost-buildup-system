import { LocalizedText } from '@/components/ui/LocalizedText';
import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
}

interface TableProps<T> {
  columns?: Column<T>[];
  data?: T[];
  onSort?: (key: keyof T) => void;
  sortKey?: keyof T;
  sortOrder?: 'asc' | 'desc';
  children?: React.ReactNode;
}

export function Table<T>({
  columns,
  data,
  onSort,
  sortKey,
  sortOrder,
  children,
}: TableProps<T>) {
  if (children) {
    return (
      <div className="flex min-w-0 flex-col">
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="inline-block min-w-full align-middle">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 relative">
                {children}
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const safeColumns = columns ?? [];
  const safeData = data ?? [];

  return (
    <div className="flex min-w-0 flex-col">
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="inline-block min-w-full align-middle">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 relative">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  {safeColumns.map((col, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[.09em] ${col.sortable ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                      onClick={() =>
                        col.sortable &&
                        typeof col.accessor !== 'function' &&
                        onSort &&
                        onSort(col.accessor as keyof T)
                      }
                    >
                      <div className="flex items-center gap-1">
                        <LocalizedText text={col.header} />
                        {col.sortable && sortKey === col.accessor && (
                          <span>
                            <LocalizedText
                              text={sortOrder === 'asc' ? '↑' : '↓'}
                            />
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {safeColumns.map((col, j) => (
                      <td
                        key={j}
                        className="px-5 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : (row[col.accessor as keyof T] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
