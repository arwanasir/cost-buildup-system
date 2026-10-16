import React from 'react';
import { useShipmentAllocations } from '@/features/cost-register/api';
import { type LandedCostResult, useLineage } from '../api';
import { Table, Badge } from '@/components/ui';

export function ItemDrilldownDrawer({
  item,
  isOpen,
  onClose,
}: {
  item: LandedCostResult;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: allocations, isLoading: loadingAlloc } = useShipmentAllocations(
    item.shipmentId,
  );
  const { data: lineageData, isLoading: loadingLineage } = useLineage(
    item.poLineId,
  );

  if (!isOpen) return null;

  // Filter allocations that apply just to this item
  const itemAllocations = (allocations || []).filter(
    (a) => a.shipmentItemId === item.shipmentItemId,
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-[650px] bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Item Lineage & Allocation Trace</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-8">
          {/* Header Info */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Item: {item.itemId}
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Total LC:{' '}
                <strong className="text-blue-700">
                  ETB {parseFloat(item.totalLandedCostEtb).toLocaleString()}
                </strong>
              </span>
              <span className="text-gray-600">
                Unit LC:{' '}
                <strong className="text-blue-700">
                  ETB{' '}
                  {parseFloat(item.perUnitLandedCostEtb).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 6 },
                  )}
                </strong>
              </span>
            </div>
          </div>

          {/* Supply Chain Lineage Flow */}
          <div>
            <h3 className="text-md font-bold text-gray-700 mb-4 border-b pb-2">
              Supply Chain Lineage
            </h3>
            {loadingLineage ? (
              <p className="text-sm text-gray-500">Loading lineage graph...</p>
            ) : !lineageData ? (
              <p className="text-sm text-gray-500">No lineage available.</p>
            ) : (
              <div className="flex flex-col space-y-4">
                {/* Node 1: PO Line */}
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-500 z-10">
                      <span className="text-blue-700 font-bold text-xs">
                        PO
                      </span>
                    </div>
                    <div className="w-0.5 h-12 bg-blue-200"></div>
                  </div>
                  <div className="pt-1">
                    <h4 className="font-semibold text-gray-800">
                      Purchase Order Line
                    </h4>
                    <p className="text-xs text-gray-500">
                      PO Ref: {lineageData.poLine?.id.slice(0, 8)}... | Ordered
                      Qty: {lineageData.poLine?.quantity}
                    </p>
                  </div>
                </div>

                {/* Node 2: Shipment Receipt */}
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center border-2 border-purple-500 z-10">
                      <span className="text-purple-700 font-bold text-xs">
                        SHP
                      </span>
                    </div>
                    <div className="w-0.5 h-12 bg-purple-200"></div>
                  </div>
                  <div className="pt-1">
                    <h4 className="font-semibold text-gray-800">
                      Shipment Received
                    </h4>
                    <p className="text-xs text-gray-500">
                      Received Qty: {item.quantityReceived} | CI Value: ETB{' '}
                      {item.ciValueEtb}
                    </p>
                  </div>
                </div>

                {/* Node 3: Allocations & Costing */}
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center border-2 border-yellow-500 z-10">
                      <span className="text-yellow-700 font-bold text-xs">
                        CST
                      </span>
                    </div>
                    <div className="w-0.5 h-12 bg-yellow-200"></div>
                  </div>
                  <div className="pt-1">
                    <h4 className="font-semibold text-gray-800">
                      Landed Cost Engine
                    </h4>
                    <p className="text-xs text-gray-500">
                      Absorbed {itemAllocations.length} distinct overhead
                      charges
                    </p>
                  </div>
                </div>

                {/* Node 4: Inventory Posting */}
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-500 z-10">
                      <span className="text-green-700 font-bold text-xs">
                        INV
                      </span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <h4 className="font-semibold text-gray-800">
                      Inventory Ledger Sync
                    </h4>
                    <p className="text-xs text-gray-500">
                      {item.isFinalised
                        ? 'Posted to ERP successfully at Unit Cost ETB ' +
                          parseFloat(item.perUnitLandedCostEtb).toFixed(6)
                        : 'Pending finalization to push to Inventory'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Allocations Drilldown Table */}
          <div>
            <h3 className="text-md font-bold text-gray-700 mb-4 border-b pb-2">
              Allocated Costs Traceability
            </h3>
            {loadingAlloc ? (
              <p className="text-sm text-gray-500">Loading trace data...</p>
            ) : itemAllocations.length === 0 ? (
              <p className="text-sm text-gray-500">No allocated costs found.</p>
            ) : (
              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <Table>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                        Source Category
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                        Method
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                        Absorbed ETB
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itemAllocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-800 font-medium">
                          {/* Note: since we query just costAllocations, we don't have the category name nested natively unless populated by backend. We show ID slice if missing. */}
                          Cost Entry [{alloc.costEntryId.slice(0, 6)}]
                          {alloc.isResidualHolder && (
                            <Badge
                              variant="warning"
                              className="ml-2 text-[10px]"
                            >
                              Residual
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {alloc.allocationMethod.replace('_', ' ')}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                          {parseFloat(alloc.allocatedEtb).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            },
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
