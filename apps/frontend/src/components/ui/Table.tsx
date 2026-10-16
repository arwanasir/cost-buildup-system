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
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg max-h-[600px] overflow-y-auto">
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
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 relative">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  {safeColumns.map((col, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                      onClick={() =>
                        col.sortable &&
                        typeof col.accessor !== 'function' &&
                        onSort &&
                        onSort(col.accessor as keyof T)
                      }
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {col.sortable && sortKey === col.accessor && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
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
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
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
