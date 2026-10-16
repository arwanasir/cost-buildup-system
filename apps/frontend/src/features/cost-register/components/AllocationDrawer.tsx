import React from 'react';
import { useShipmentAllocations, useShipmentCostEntries } from '../api';
import { Table, Badge } from '@/components/ui';

export function AllocationDrawer({
  shipmentId,
  isOpen,
  onClose,
}: {
  shipmentId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: allocations, isLoading } = useShipmentAllocations(shipmentId);
  const { data: entries } = useShipmentCostEntries(shipmentId);

  if (!isOpen) return null;

  // Group allocations by Item
  const groupedByItem = (allocations || []).reduce((acc: any, alloc: any) => {
    const itemId = alloc.itemDetail?.itemId || 'Unknown Item';
    if (!acc[itemId])
      acc[itemId] = {
        itemDetail: alloc.itemDetail,
        allocations: [],
        totalAllocated: 0,
      };
    acc[itemId].allocations.push(alloc);
    acc[itemId].totalAllocated += parseFloat(alloc.allocatedEtb || 0);
    return acc;
  }, {});

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Allocation Results</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {isLoading ? (
            <p className="text-center text-gray-500">Loading allocations...</p>
          ) : allocations?.length === 0 ? (
            <p className="text-center text-gray-500">
              No allocations found. Run the allocation engine first.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByItem).map(
                ([itemId, group]: [string, any]) => (
                  <div
                    key={itemId}
                    className="bg-white border rounded-md shadow-sm overflow-hidden"
                  >
                    <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-gray-800">{itemId}</h4>
                        <div className="text-xs text-gray-500 mt-1 flex space-x-3">
                          <span>
                            CI:{' '}
                            {parseFloat(
                              group.itemDetail.ciValueEtb,
                            ).toLocaleString()}{' '}
                            ETB
                          </span>
                          {group.itemDetail.weightKg && (
                            <span>Wt: {group.itemDetail.weightKg} kg</span>
                          )}
                          {group.itemDetail.volumeCbm && (
                            <span>Vol: {group.itemDetail.volumeCbm} cbm</span>
                          )}
                          {group.itemDetail.quantity && (
                            <span>Qty: {group.itemDetail.quantity}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">
                          Total Allocated
                        </div>
                        <div className="font-bold text-blue-700">
                          ETB{' '}
                          {group.totalAllocated.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>

                    <Table>
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">
                            Cost Entry
                          </th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">
                            Method
                          </th>
                          <th className="px-3 py-2 text-right text-xs text-gray-500">
                            Allocated (ETB)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {group.allocations.map((alloc: any) => {
                          const entry = entries?.find(
                            (e) => e.id === alloc.costEntryId,
                          );
                          const categoryName =
                            entry?.costCategory?.name || 'Unknown Cost';

                          return (
                            <tr key={alloc.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm">
                                {categoryName}
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
                              <td className="px-3 py-2 text-sm text-right font-medium">
                                {parseFloat(alloc.allocatedEtb).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 4,
                                    maximumFractionDigits: 4,
                                  },
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
