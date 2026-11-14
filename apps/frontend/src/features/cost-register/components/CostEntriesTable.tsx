import { LocalizedText } from '@/components/ui/LocalizedText';
import { useUiText } from '@/lib/ui-text';
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
      <LocalizedText text={'\n      View\n    '} />
    </a>
  ) : (
    <span className="text-gray-400">
      <LocalizedText text={'Loading...'} />
    </span>
  );
}

import { useAuthStore } from '@/store/auth.store';
import { formatAmount4, formatFx } from '@/lib/money';

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
  const localize = useUiText();
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
              <LocalizedText
                text={'\n              Category / Subcategory\n            '}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <LocalizedText
                text={'\n              Provider & Invoice\n            '}
              />
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <LocalizedText
                text={'\n              Foreign Amount\n            '}
              />
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <LocalizedText text={'\n              FX Rate\n            '} />
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <LocalizedText
                text={'\n              ETB Amount\n            '}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <LocalizedText
                text={'\n              Allocation Method\n            '}
              />
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <LocalizedText
                text={'\n              Attachment\n            '}
              />
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <LocalizedText text={'\n              Actions\n            '} />
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
                          <Badge variant="warning">
                            <LocalizedText text={'Estimated'} />
                          </Badge>
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
                        {entry.amountForeign == null
                          ? '—'
                          : formatAmount4(entry.amountForeign)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.currency}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top text-gray-600">
                      {formatFx(entry.fxRate)}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-bold text-gray-900">
                      {formatAmount4(entry.amountEtb)}
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
                            <LocalizedText
                              text={
                                '\n                            Reverse\n                          '
                              }
                            />
                          </Button>
                        ) : (
                          <span
                            title={localize(
                              'Locked (System sourced or Actualized)',
                            )}
                          >
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
                              <LocalizedText
                                text={
                                  '\n                              Mark Actual\n                            '
                                }
                              />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => onDelete(entry.id)}
                          >
                            <LocalizedText
                              text={
                                '\n                            Delete\n                          '
                              }
                            />
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
                <LocalizedText
                  text={
                    '\n                No cost entries recorded.\n              '
                  }
                />
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
