import React, { useState, useEffect } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Input,
  Badge,
  Skeleton,
} from '@/components/ui';
import { useShipments, useShipment } from '@/features/import-shipments/api';
import { usePurchaseOrder } from '@/features/purchase-orders/api';
import { useCreateGrn } from '../api';
import { useNavigate } from 'react-router-dom';

export function GoodsReceiptFormPage() {
  const navigate = useNavigate();
  const { data: shipmentsResponse, isLoading: loadingShipments } =
    useShipments();
  const shipments = Array.isArray(shipmentsResponse)
    ? shipmentsResponse
    : shipmentsResponse?.data || [];

  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [warehouseLocation, setWarehouseLocation] = useState('');

  const { data: shipmentResponse, isLoading: loadingShipment } =
    useShipment(selectedShipmentId);
  const shipment = shipmentResponse?.data;
  const { data: po } = usePurchaseOrder(shipment?.poId || '');

  const createGrnMutation = useCreateGrn();

  const [itemsState, setItemsState] = useState<
    Record<
      string,
      {
        receivedQuantity: string;
        inspectionResult: 'accepted' | 'rejected' | 'partial';
        acceptedQuantity: string;
        rejectedQuantity: string;
        rejectionReason: string;
      }
    >
  >({});

  // Initialize items state when shipment loads
  useEffect(() => {
    if (shipment?.items) {
      const state: any = {};
      shipment.items.forEach((item) => {
        state[item.id] = {
          receivedQuantity: item.shippedQuantity.toString(),
          inspectionResult: 'accepted',
          acceptedQuantity: item.shippedQuantity.toString(),
          rejectedQuantity: '0',
          rejectionReason: '',
        };
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItemsState(state);
    }
  }, [shipment]);

  const handleItemChange = (itemId: string, field: string, value: string) => {
    setItemsState((prev) => {
      const curr = { ...prev[itemId], [field]: value };

      // Auto-compute accepted vs rejected for partial
      if (field === 'inspectionResult') {
        if (value === 'accepted') {
          curr.acceptedQuantity = curr.receivedQuantity;
          curr.rejectedQuantity = '0';
        } else if (value === 'rejected') {
          curr.acceptedQuantity = '0';
          curr.rejectedQuantity = curr.receivedQuantity;
        }
      } else if (field === 'receivedQuantity') {
        if (curr.inspectionResult === 'accepted') {
          curr.acceptedQuantity = value;
        } else if (curr.inspectionResult === 'rejected') {
          curr.rejectedQuantity = value;
        }
      }

      return { ...prev, [itemId]: curr };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;

    const itemsPayload = shipment.items.map((item) => {
      const state = itemsState[item.id];
      return {
        shipmentItemId: item.id,
        receivedQuantity: parseFloat(state.receivedQuantity || '0').toString(),
        inspectionResult: state.inspectionResult,
        acceptedQuantity: parseFloat(state.acceptedQuantity || '0').toString(),
        rejectedQuantity: parseFloat(state.rejectedQuantity || '0').toString(),
        rejectionReason: state.rejectionReason || undefined,
      };
    });

    try {
      await createGrnMutation.mutateAsync({
        shipmentId: shipment.id,
        receiptDate,
        warehouseLocation,
        items: itemsPayload,
      });
      navigate('/goods-receipts');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create GRN');
    }
  };

  const isBlocked =
    shipment &&
    !['cleared', 'partially_received', 'received'].includes(shipment.status);

  if (loadingShipments) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="New Goods Receipt (GRN)"
        description="Record incoming inventory and log discrepancies."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 bg-white shadow-sm border space-y-4">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
            GRN Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select
              label="Select Shipment *"
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              options={[
                { label: '-- Select Shipment --', value: '' },
                ...shipments.map((s: any) => ({
                  label: `${s.shipmentNumber} [${s.status.toUpperCase()}]`,
                  value: s.id,
                })),
              ]}
              required
            />
            <Input
              label="Receipt Date *"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              required
            />
            <Input
              label="Warehouse Location *"
              value={warehouseLocation}
              onChange={(e) => setWarehouseLocation(e.target.value)}
              placeholder="e.g. Zone A, Rack 12"
              required
            />
          </div>
        </Card>

        {isBlocked && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-md flex items-start gap-3">
            <span className="text-red-600 font-bold text-xl mt-0.5">
              &#9888;
            </span>
            <div>
              <h4 className="font-bold text-red-800">
                AC06: Customs Release Required
              </h4>
              <p className="text-sm text-red-700">
                A GRN cannot be initiated for a shipment unless it has been
                cleared by customs. This shipment is currently in '
                {shipment.status}' status.
              </p>
            </div>
          </div>
        )}

        {!isBlocked && shipment && (
          <Card className="p-0 bg-white shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                Received Line Items
              </h3>
              {po && (
                <span className="text-sm text-gray-600 font-medium">
                  Linked PO: {po.poNumber}
                </span>
              )}
            </div>

            <div className="divide-y">
              {shipment.items.map((item) => {
                const state = itemsState[item.id];
                if (!state) return null;

                const poLine = po?.lines?.find(
                  (i: any) => i.id === item.poLineId,
                );
                const poQty = poLine ? parseFloat(poLine.quantity) : 0;
                const shippedQty = parseFloat(item.shippedQuantity.toString());
                const rcvQty = parseFloat(state.receivedQuantity || '0');
                const isDiscrepant = rcvQty !== shippedQty;

                const isPartial = state.inspectionResult === 'partial';
                const isRejected = state.inspectionResult === 'rejected';
                const isAccepted = state.inspectionResult === 'accepted';
                const accQty = parseFloat(state.acceptedQuantity || '0');
                const rejQty = parseFloat(state.rejectedQuantity || '0');
                const sumError = accQty + rejQty !== rcvQty && !isAccepted;
                const needsReason =
                  (isPartial || isRejected) && !state.rejectionReason;

                return (
                  <div
                    key={item.id}
                    className="p-4 border-b last:border-b-0 hover:bg-gray-50 flex flex-col lg:flex-row gap-6"
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-800">
                          Item: {item.itemId || item.id.slice(0, 8)}
                        </h4>
                        {isDiscrepant ? (
                          <Badge
                            variant="warning"
                            className="text-[10px] uppercase"
                          >
                            Discrepancy
                          </Badge>
                        ) : (
                          <span className="text-green-500 font-bold">
                            &#10003; Matches Shipped
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 bg-gray-100 p-3 rounded-md">
                        <div className="flex flex-col">
                          <span className="text-xs uppercase text-gray-500 font-bold">
                            PO Qty
                          </span>
                          <strong className="text-gray-900">
                            {poQty.toLocaleString()}
                          </strong>
                        </div>
                        <div className="flex flex-col border-l pl-4">
                          <span className="text-xs uppercase text-gray-500 font-bold">
                            Shipped Qty
                          </span>
                          <strong className="text-gray-900">
                            {shippedQty.toLocaleString()}
                          </strong>
                        </div>
                        <div className="flex flex-col border-l pl-4">
                          <span className="text-xs uppercase text-gray-500 font-bold">
                            Received Qty *
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={state.receivedQuantity}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                'receivedQuantity',
                                e.target.value,
                              )
                            }
                            className="w-24 mt-1"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 bg-white p-4 border rounded-md shadow-sm space-y-4">
                      <h5 className="font-semibold text-gray-700 border-b pb-1">
                        Inspection Result (FR-09.2)
                      </h5>
                      <Select
                        value={state.inspectionResult}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            'inspectionResult',
                            e.target.value,
                          )
                        }
                        options={[
                          { label: 'Accepted', value: 'accepted' },
                          {
                            label: 'Accepted with Conditions (Partial)',
                            value: 'partial',
                          },
                          { label: 'Rejected', value: 'rejected' },
                        ]}
                        required
                      />

                      {!isAccepted && (
                        <div className="space-y-4 bg-red-50 p-4 rounded-md border border-red-100">
                          <div className="flex gap-4">
                            <Input
                              label="Accepted Quantity"
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.acceptedQuantity}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'acceptedQuantity',
                                  e.target.value,
                                )
                              }
                              required
                            />
                            <Input
                              label="Rejected Quantity"
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.rejectedQuantity}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'rejectedQuantity',
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </div>
                          {sumError && (
                            <p className="text-sm font-bold text-red-600">
                              &#9888; Accepted + Rejected must equal Received
                              Quantity ({rcvQty})
                            </p>
                          )}
                          <Input
                            label="Rejection Reason *"
                            placeholder="Required..."
                            value={state.rejectionReason}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                'rejectionReason',
                                e.target.value,
                              )
                            }
                            error={needsReason ? 'Reason is required' : ''}
                            required
                          />
                          {rejQty > 0 && (
                            <div className="text-sm font-bold text-yellow-700 flex items-start gap-2 mt-2 bg-yellow-50 p-2 border border-yellow-200 rounded">
                              <span className="text-yellow-600 text-lg leading-none">
                                &#9888;
                              </span>
                              <span>
                                FR-09.2: These {rejQty} units will be flagged
                                for Quarantine and trigger a Claims Workflow.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={() => navigate('/goods-receipts')}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isBlocked || !shipment}
            isLoading={createGrnMutation.isPending}
          >
            Save Goods Receipt
          </Button>
        </div>
      </form>
    </div>
  );
}
