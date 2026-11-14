import { LocalizedText } from '@/components/ui/LocalizedText';
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
        const normalized = col.toLowerCase();
        const sample = rows.find(
          (row) => row[col] !== null && row[col] !== undefined,
        )?.[col];
        const isMoney =
          /etb|foreign|amount|cost|value|duty|variance|freight|insurance|vat|bank.?charges|port.?charges|clearing.?fee|other.?charges|commission|price|fee/.test(
            normalized,
          );
        const isDate = normalized.includes('date') || normalized === 'eta';
        const type = isMoney
          ? 'money'
          : isDate
            ? 'date'
            : typeof sample === 'number'
              ? 'number'
              : 'text';
        const label = col
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/_/g, ' ')
          .replace(/\bId\b/g, 'ID');
        return { key: col, label, type };
      }
      return col;
    });
  }, [rawColumns, rows]);

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    const columnType =
      columns.find((column) => column.key === sortConfig.key)?.type || 'text';
    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal == null || bVal == null) {
        if (aVal == null && bVal == null) return 0;
        return aVal == null ? 1 : -1;
      }
      if (columnType === 'number' || columnType === 'money') {
        const delta = Number(aVal) - Number(bVal);
        if (Number.isFinite(delta) && delta !== 0) {
          return sortConfig.direction === 'asc' ? delta : -delta;
        }
      } else if (columnType === 'date') {
        const delta = new Date(aVal).getTime() - new Date(bVal).getTime();
        if (Number.isFinite(delta) && delta !== 0) {
          return sortConfig.direction === 'asc' ? delta : -delta;
        }
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [columns, rows, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleExpand = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderValue = (val: any, type: string) => {
    if (val === null || val === undefined) return '-';
    if (type === 'money') {
      const amount = Number(val);
      return Number.isFinite(amount)
        ? amount.toLocaleString('en-US', {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          })
        : String(val);
    }
    if (type === 'date') {
      const date = new Date(val);
      return Number.isNaN(date.getTime())
        ? String(val)
        : date.toLocaleDateString();
    }
    if (typeof val === 'boolean') {
      return val ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          <LocalizedText text={'\n          Yes\n        '} />
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <LocalizedText text={'\n          No\n        '} />
        </span>
      );
    }
    if (typeof val === 'object') {
      const serialized = JSON.stringify(val);
      return (
        <span
          className="block max-w-xs truncate text-gray-600"
          title={serialized}
        >
          {serialized}
        </span>
      );
    }
    return String(val);
  };

  if (!rows || rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <LocalizedText text={'No data available'} />
      </div>
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
                aria-sort={
                  sortConfig?.key === col.key
                    ? sortConfig.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className={`px-4 py-3.5 text-xs font-semibold text-gray-900 uppercase hover:bg-gray-100 ${col.type === 'money' || col.type === 'number' ? 'text-right' : 'text-left'}`}
              >
                <button
                  type="button"
                  onClick={() => handleSort(col.key)}
                  className={`flex w-full items-center gap-1 text-inherit ${col.type === 'money' || col.type === 'number' ? 'justify-end' : 'justify-start'}`}
                >
                  <LocalizedText text={col.label} />
                  {sortConfig?.key === col.key && (
                    <span className="text-gray-400">
                      <LocalizedText
                        text={sortConfig.direction === 'asc' ? '↑' : '↓'}
                      />
                    </span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {sortedRows.map((row, index) => {
            const rowKey = `${row.id || row.shipmentId || row.itemId || row.supplierId || index}:${row.reportSection || ''}:${row.varianceType || ''}`;
            const isExpanded = expandedRows.has(rowKey);
            return (
              <React.Fragment key={rowKey}>
                <tr
                  className={
                    'hover:bg-gray-50 ' + (row.isOverdue ? 'bg-red-50' : '')
                  }
                >
                  {expandableRow && (
                    <td
                      className="px-4 py-3 cursor-pointer text-gray-400 hover:text-gray-600"
                      onClick={() => toggleExpand(rowKey)}
                    >
                      <LocalizedText text={isExpanded ? '▼' : '▶'} />
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
