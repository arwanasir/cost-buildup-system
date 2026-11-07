import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { Table, Button } from '@/components/ui';
import { type LandedCostResult } from '../api';
import { ItemDrilldownDrawer } from './ItemDrilldownDrawer';
import { formatAmount4 } from '@/lib/money';

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
              <LocalizedText text={'\n              Item ID\n            '} />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText text={'\n              Qty Recv\n            '} />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              CI Value (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Duty (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText text={'\n              VAT (ETB)\n            '} />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Freight (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Ins. (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Bank (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Port (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Clearing (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText
                text={'\n              Other (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold text-gray-800 uppercase">
              <LocalizedText
                text={'\n              Total LC (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold text-blue-800 uppercase">
              <LocalizedText
                text={'\n              Unit LC (ETB)\n            '}
              />
            </th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
              <LocalizedText text={'\n              Drilldown\n            '} />
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
                {formatAmount4(item.ciValueEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {formatAmount4(item.customsDutyEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {formatAmount4(item.importVatEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {formatAmount4(item.freightAllocatedEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {formatAmount4(item.insuranceAllocatedEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {formatAmount4(item.bankChargesAllocatedEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {formatAmount4(item.portChargesAllocatedEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {formatAmount4(item.clearingFeeAllocatedEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right text-gray-600">
                {formatAmount4(item.otherChargesAllocatedEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right font-bold text-gray-900">
                {formatAmount4(item.totalLandedCostEtb)}
              </td>
              <td className="px-3 py-2 text-sm text-right font-black text-blue-700">
                {formatAmount4(item.perUnitLandedCostEtb)}
              </td>
              <td className="px-3 py-2 text-center">
                <Button variant="outline" onClick={() => setSelectedItem(item)}>
                  <LocalizedText
                    text={'\n                  Trace\n                '}
                  />
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
