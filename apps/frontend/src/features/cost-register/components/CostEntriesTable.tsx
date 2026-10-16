import React from 'react';
import { Table, Badge, Button } from '@/components/ui';
import { type CostEntry } from '../api';
import { useCostEntryAttachment } from '../api';

function AttachmentLink({
  entryId,
  hasAttachment,
}: {
  entryId: string;
  hasAttachment: boolean;
}) {
  const { data } = useCostEntryAttachment(entryId);

  if (!hasAttachment) return <span className="text-gray-400">-</span>;

  return data?.url ? (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline"
    >
      View
    </a>
  ) : (
    <span className="text-gray-400">Loading...</span>
  );
}

import { useAuthStore } from '@/store/auth.store';

export function CostEntriesTable({
  entries,
  onDelete,
  onMarkActual,
  onReverse,
  isFinalised,
}: {
  entries: CostEntry[];
  onDelete: (id: string) => void;
  onMarkActual: (entry: CostEntry) => void;
  onReverse: (entry: CostEntry) => void;
  isFinalised?: boolean;
}) {
  // Group entries by Category
  const user = useAuthStore((s) => s.user);
  const grouped = entries.reduce(
    (acc, entry) => {
      const cat = entry.costCategory?.name || 'Unknown Category';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(entry);
      return acc;
    },
    {} as Record<string, CostEntry[]>,
  );

  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm">
      <Table>
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Category / Subcategory
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Provider & Invoice
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Foreign Amount
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              FX Rate
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              ETB Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Allocation Method
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Attachment
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y bg-white">
          {Object.entries(grouped).map(([categoryName, catEntries]) => (
            <React.Fragment key={categoryName}>
              {/* Group Header Row */}
              <tr className="bg-gray-100">
                <td colSpan={8} className="px-4 py-2 font-bold text-gray-700">
                  {categoryName}
                </td>
              </tr>
              {/* Group Items */}
              {catEntries.map((entry) => {
                const isLocked =
                  isFinalised ||
                  entry.source === 'system' ||
                  entry.status === 'actual';

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">
                        {entry.costSubcategory || '-'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {entry.isEstimated ? (
                          <Badge variant="warning">Estimated</Badge>
                        ) : (
                          <Badge
                            variant={
                              entry.status === 'actual' ? 'success' : 'default'
                            }
                          >
                            {entry.status}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-800">
                        {entry.providerName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {entry.invoiceNumber}
                      </div>
                      <div className="text-xs text-gray-400">
                        {entry.invoiceDate}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="font-semibold text-gray-700">
                        {parseFloat(entry.amountForeign).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.currency}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top text-gray-600">
                      {parseFloat(entry.fxRate).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-bold text-gray-900">
                      {parseFloat(entry.amountEtb).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge variant="default" className="text-xs font-normal">
                        {entry.allocationMethod.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <AttachmentLink
                        entryId={entry.id}
                        hasAttachment={!!entry.attachment}
                      />
                    </td>
                    <td className="px-4 py-3 text-right align-top space-x-2">
                      {isLocked ? (
                        entry.status === 'actual' &&
                        user?.role === 'finance_manager' &&
                        !isFinalised &&
                        entry.source !== 'system' ? (
                          <Button
                            variant="danger"
                            onClick={() => onReverse(entry)}
                          >
                            Reverse
                          </Button>
                        ) : (
                          <span title="Locked (System sourced or Actualized)">
                            &#128274;
                          </span>
                        )
                      ) : (
                        <>
                          {entry.isEstimated && entry.status === 'draft' && (
                            <Button
                              variant="primary"
                              onClick={() => onMarkActual(entry)}
                            >
                              Mark Actual
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => onDelete(entry.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                No cost entries recorded.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
