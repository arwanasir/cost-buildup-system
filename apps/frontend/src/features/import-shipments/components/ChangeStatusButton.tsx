import React, { useState } from 'react';
import { useUpdateShipmentStatus, type Shipment } from '../api';
import { Button, Input, PermissionGate } from '@/components/ui';

export function ChangeStatusButton({
  shipmentId,
  nextStatus,
}: {
  shipmentId: string;
  nextStatus: Shipment['status'];
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [arrivalDate, setArrivalDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const updateStatus = useUpdateShipmentStatus();

  const handleAdvance = () => {
    if (nextStatus === 'at_customs') {
      setShowConfirm(true);
    } else {
      executeStatusUpdate();
    }
  };

  const executeStatusUpdate = async () => {
    try {
      await updateStatus.mutateAsync({
        id: shipmentId,
        status: nextStatus,
        actualArrivalDate:
          nextStatus === 'at_customs' ? arrivalDate : undefined,
      });
      setShowConfirm(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <PermissionGate permission="shipment:write">
        <Button
          variant="primary"
          onClick={handleAdvance}
          isLoading={updateStatus.isPending}
        >
          Advance to {nextStatus.replace('_', ' ').toUpperCase()}
        </Button>
      </PermissionGate>

      {showConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Port Arrival
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              To move this shipment into Customs Clearance, you must log the
              actual date the vessel arrived at the port.
            </p>
            <div className="mb-6">
              <Input
                label="Actual Arrival Date"
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={executeStatusUpdate}
                isLoading={updateStatus.isPending}
              >
                Confirm Arrival
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
