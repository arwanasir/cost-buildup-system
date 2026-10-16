import React, { useState } from 'react';
import { Table, Button } from '@/components/ui';
import { type LandedCostResult } from '../api';
import { ItemDrilldownDrawer } from './ItemDrilldownDrawer';

export function LandedCostResultsTable({ data }: { data: LandedCostResult[] }) {
  const [selectedItem, setSelectedItem] = useState<LandedCostResult | null>(
    null,
  );

  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
      <Table>
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Item ID
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Qty Recv
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              CI Value (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Duty (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              VAT (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Freight (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Ins. (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Bank (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Port (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Clearing (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Other (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold text-gray-800 uppercase">
              Total LC (ETB)
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold text-blue-800 uppercase">
              Unit LC (ETB)
            </th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
              Drilldown
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-sm font-semibold text-gray-800">
                {item.itemId}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.quantityReceived).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.ciValueEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.customsDutyEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.importVatEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.freightAllocatedEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.insuranceAllocatedEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.bankChargesAllocatedEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.portChargesAllocatedEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.clearingFeeAllocatedEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {parseFloat(item.otherChargesAllocatedEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right font-bold text-gray-900">
                {parseFloat(item.totalLandedCostEtb).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-right font-black text-blue-700">
                {parseFloat(item.perUnitLandedCostEtb).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 6, maximumFractionDigits: 6 },
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <Button variant="outline" onClick={() => setSelectedItem(item)}>
                  Trace
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {selectedItem && (
        <ItemDrilldownDrawer
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
