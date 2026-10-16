import React, { useState } from 'react';
import { type CostSummary } from '../api';
import { Card, Table } from '@/components/ui';

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
              Supplier Cost
            </div>
            <div className="text-lg font-bold">
              ETB {parseFloat(summary.totalSupplierCostEtb).toLocaleString()}
            </div>
          </div>
          <div className="text-gray-300 text-2xl font-light">|</div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
              Additional Charges
            </div>
            <div className="text-lg font-bold">
              ETB{' '}
              {parseFloat(summary.totalAdditionalChargesEtb).toLocaleString()}
            </div>
          </div>
          <div className="text-gray-300 text-2xl font-light">|</div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
              Grand Total
            </div>
            <div className="text-lg font-bold text-blue-700">
              ETB {parseFloat(summary.grandTotalEtb).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Variance Summary */}
        <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-md border">
          <div>
            <div className="text-xs text-gray-500">Est vs Actual</div>
            <div className="text-sm font-medium">
              {parseFloat(summary.variance.estimatedTotalEtb).toLocaleString()}{' '}
              / {parseFloat(summary.variance.actualTotalEtb).toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Variance</div>
            <div className={`text-sm font-bold ${varianceColor}`}>
              {variancePercent > 0 ? '+' : ''}
              {parseFloat(summary.variance.varianceAmountEtb).toLocaleString()}
              <span className="ml-1 text-xs">({variancePercent}%)</span>
            </div>
          </div>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <span>{expanded ? 'Hide Details' : 'View Breakdown & Previews'}</span>
          {expanded ? <span>&#9650;</span> : <span>&#9660;</span>}
        </button>
      </div>

      {/* Expanded Details Panel */}
      {expanded && (
        <div className="p-4 border-t bg-gray-50 grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[50vh] overflow-y-auto">
          {/* Charges by Category */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">
              Charges by Category
            </h4>
            <Table>
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs">Category</th>
                  <th className="px-3 py-2 text-right text-xs">Estimated</th>
                  <th className="px-3 py-2 text-right text-xs">Actual</th>
                  <th className="px-3 py-2 text-right text-xs">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {summary.chargesByCategory.map((cat, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-sm">{cat.categoryName}</td>
                    <td className="px-3 py-2 text-sm text-right text-gray-500">
                      {parseFloat(cat.estimatedAmountEtb).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-medium">
                      {parseFloat(cat.actualAmountEtb).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-bold text-gray-800">
                      {parseFloat(cat.totalAmountEtb).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {summary.chargesByCategory.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-sm text-gray-400"
                    >
                      No additional charges recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Per-Unit Preview */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">
              Per-Unit Landed Cost Preview (Draft)
            </h4>
            <Table>
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs">Item ID</th>
                  <th className="px-3 py-2 text-right text-xs">
                    CI Value (ETB)
                  </th>
                  <th className="px-3 py-2 text-right text-xs">
                    Allocated Costs
                  </th>
                  <th className="px-3 py-2 text-right text-xs">
                    Unit LC (ETB)
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
                      {parseFloat(item.ciValueEtb).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-500">
                      {parseFloat(item.allocatedDraftCostsEtb).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-bold text-blue-700">
                      {parseFloat(item.perUnitLandedCostEtb).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {summary.itemPreviews.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-sm text-gray-400"
                    >
                      No items found in shipment.
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
