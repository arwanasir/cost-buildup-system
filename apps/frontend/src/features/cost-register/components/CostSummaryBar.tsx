import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { type CostSummary } from '../api';
import { Card, Table } from '@/components/ui';
import { formatAmount4 } from '@/lib/money';

export function CostSummaryBar({ summary }: { summary: CostSummary }) {
  const [expanded, setExpanded] = useState(false);

  const variancePercent = parseFloat(summary.variance.variancePercent);
  const varianceColor =
    variancePercent > 0
      ? 'text-red-600'
      : variancePercent < 0
        ? 'text-green-600'
        : 'text-gray-600';

  return (
    <Card className="sticky top-0 z-10 bg-white border-b shadow-sm mb-6">
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Core Totals */}
        <div className="flex space-x-6">
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
              <LocalizedText
                text={'\n              Supplier Cost\n            '}
              />
            </div>
            <div className="text-lg font-bold">
              <LocalizedText text={'\n              ETB '} />
              {formatAmount4(summary.totalSupplierCostEtb)}
            </div>
          </div>
          <div className="text-gray-300 text-2xl font-light">|</div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
              <LocalizedText
                text={'\n              Additional Charges\n            '}
              />
            </div>
            <div className="text-lg font-bold">
              <LocalizedText text={'\n              ETB'} />
              <LocalizedText text={' '} />
              {formatAmount4(summary.totalAdditionalChargesEtb)}
            </div>
          </div>
          <div className="text-gray-300 text-2xl font-light">|</div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
              <LocalizedText
                text={'\n              Grand Total\n            '}
              />
            </div>
            <div className="text-lg font-bold text-blue-700">
              <LocalizedText text={'\n              ETB '} />
              {formatAmount4(summary.grandTotalEtb)}
            </div>
          </div>
        </div>

        {/* Variance Summary */}
        <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-md border">
          <div>
            <div className="text-xs text-gray-500">
              <LocalizedText text={'Est vs Actual'} />
            </div>
            <div className="text-sm font-medium">
              {formatAmount4(summary.variance.estimatedTotalEtb)}
              <LocalizedText text={' '} />/{' '}
              {formatAmount4(summary.variance.actualTotalEtb)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">
              <LocalizedText text={'Variance'} />
            </div>
            <div className={`text-sm font-bold ${varianceColor}`}>
              <LocalizedText text={variancePercent > 0 ? '+' : ''} />
              {formatAmount4(summary.variance.varianceAmountEtb)}
              <span className="ml-1 text-xs">({variancePercent}%)</span>
            </div>
          </div>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <span>
            <LocalizedText
              text={expanded ? 'Hide Details' : 'View Breakdown & Previews'}
            />
          </span>
          {expanded ? <span>&#9650;</span> : <span>&#9660;</span>}
        </button>
      </div>

      {/* Expanded Details Panel */}
      {expanded && (
        <div className="p-4 border-t bg-gray-50 grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[50vh] overflow-y-auto">
          {/* Charges by Category */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">
              <LocalizedText
                text={'\n              Charges by Category\n            '}
              />
            </h4>
            <Table>
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs">
                    <LocalizedText text={'Category'} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs">
                    <LocalizedText text={'Estimated'} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs">
                    <LocalizedText text={'Actual'} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs">
                    <LocalizedText text={'Total'} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {summary.chargesByCategory.map((cat, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-sm">{cat.categoryName}</td>
                    <td className="px-3 py-2 text-sm text-right text-gray-500">
                      {formatAmount4(cat.estimatedAmountEtb)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-medium">
                      {formatAmount4(cat.actualAmountEtb)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-bold text-gray-800">
                      {formatAmount4(cat.totalAmountEtb)}
                    </td>
                  </tr>
                ))}
                {summary.chargesByCategory.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-sm text-gray-400"
                    >
                      <LocalizedText
                        text={
                          '\n                      No additional charges recorded.\n                    '
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Per-Unit Preview */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">
              <LocalizedText
                text={
                  '\n              Per-Unit Landed Cost Preview (Draft)\n            '
                }
              />
            </h4>
            <Table>
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs">
                    <LocalizedText text={'Item ID'} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs">
                    <LocalizedText
                      text={
                        '\n                    CI Value (ETB)\n                  '
                      }
                    />
                  </th>
                  <th className="px-3 py-2 text-right text-xs">
                    <LocalizedText
                      text={
                        '\n                    Allocated Costs\n                  '
                      }
                    />
                  </th>
                  <th className="px-3 py-2 text-right text-xs">
                    <LocalizedText
                      text={
                        '\n                    Unit LC (ETB)\n                  '
                      }
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {summary.itemPreviews.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-sm font-medium">
                      {item.itemId}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-500">
                      {formatAmount4(item.ciValueEtb)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-500">
                      {formatAmount4(item.allocatedDraftCostsEtb)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-bold text-blue-700">
                      {formatAmount4(item.perUnitLandedCostEtb)}
                    </td>
                  </tr>
                ))}
                {summary.itemPreviews.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-sm text-gray-400"
                    >
                      <LocalizedText
                        text={
                          '\n                      No items found in shipment.\n                    '
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  );
}
