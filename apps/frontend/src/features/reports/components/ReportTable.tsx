import React, { useState, useMemo } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'money' | 'date';
}

export interface ReportTableProps {
  columns: string[] | ColumnDef[];
  rows: any[];
  totals?: Record<string, any>;
  expandableRow?: (row: any) => React.ReactNode;
}

export function ReportTable({
  columns: rawColumns,
  rows,
  totals,
  expandableRow,
}: ReportTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Normalize columns
  const columns = useMemo(() => {
    return rawColumns.map((col) => {
      if (typeof col === 'string') {
        // Guess type
        const type =
          col.toLowerCase().includes('etb') ||
          col.toLowerCase().includes('foreign') ||
          col.toLowerCase().includes('amount') ||
          col.toLowerCase().includes('cost') ||
          col.toLowerCase().includes('value') ||
          col.toLowerCase().includes('duty') ||
          col.toLowerCase().includes('variance')
            ? 'money'
            : col.toLowerCase().includes('date') ||
                col.toLowerCase().includes('at')
              ? 'date'
              : 'text';
        return { key: col, label: col.replace(/_/g, ' '), type };
      }
      return col;
    });
  }, [rawColumns]);

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      const key = String(index);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderValue = (val: any, type: string) => {
    if (val === null || val === undefined) return '-';
    if (type === 'money')
      return parseFloat(val).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    if (type === 'date') return new Date(val).toLocaleDateString();
    if (typeof val === 'boolean') {
      return val ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          Yes
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          No
        </span>
      );
    }
    if (typeof val === 'object')
      return <span className="text-gray-400 italic">[Object]</span>;
    return String(val);
  };

  if (!rows || rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">No data available</div>
    );
  }

  return (
    <div className="overflow-x-auto relative shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
          <tr>
            {expandableRow && <th className="w-8 px-4 py-3.5" />}
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`px-4 py-3.5 text-xs font-semibold text-gray-900 uppercase cursor-pointer hover:bg-gray-100 ${col.type === 'money' || col.type === 'number' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`flex items-center gap-1 ${col.type === 'money' || col.type === 'number' ? 'justify-end' : ''}`}
                >
                  {col.label}
                  {sortConfig?.key === col.key && (
                    <span className="text-gray-400">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {sortedRows.map((row, index) => {
            const isExpanded = expandedRows.has(String(index));
            return (
              <React.Fragment key={index}>
                <tr
                  className={
                    'hover:bg-gray-50 ' + (row.isOverdue ? 'bg-red-50' : '')
                  }
                >
                  {expandableRow && (
                    <td
                      className="px-4 py-3 cursor-pointer text-gray-400 hover:text-gray-600"
                      onClick={() => toggleExpand(index)}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm whitespace-nowrap ${col.type === 'money' ? 'font-medium text-gray-900 text-right' : col.type === 'number' ? 'text-right text-gray-700' : 'text-gray-700 text-left'}`}
                    >
                      {renderValue(row[col.key], col.type || 'text')}
                    </td>
                  ))}
                </tr>
                {isExpanded && expandableRow && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="p-0 bg-gray-50 border-b"
                    >
                      {expandableRow(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        {totals && Object.keys(totals).length > 0 && (
          <tfoot className="bg-gray-50 font-bold sticky bottom-0 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
            <tr>
              {expandableRow && <td />}
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm ${col.type === 'money' || col.type === 'number' ? 'text-right' : 'text-left'}`}
                >
                  {i === 0 && !totals[col.key]
                    ? 'TOTAL'
                    : renderValue(totals[col.key], col.type || 'text')}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
