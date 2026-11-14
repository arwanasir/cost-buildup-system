import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
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
  const localize = useUiText();
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
          <LocalizedText text={'\n          Advance to '} />
          {localize(nextStatus.replace(/_/g, ' '))}
        </Button>
      </PermissionGate>

      {showConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <LocalizedText
                text={'\n              Confirm Port Arrival\n            '}
              />
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              <LocalizedText
                text={
                  '\n              To move this shipment into Customs Clearance, you must log the\n              actual date the vessel arrived at the port.\n            '
                }
              />
            </p>
            <div className="mb-6">
              <Input
                label={localize('Actual Arrival Date')}
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                <LocalizedText
                  text={'\n                Cancel\n              '}
                />
              </Button>
              <Button
                variant="primary"
                onClick={executeStatusUpdate}
                isLoading={updateStatus.isPending}
              >
                <LocalizedText
                  text={'\n                Confirm Arrival\n              '}
                />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
