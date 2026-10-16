import React, { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import {
  useAllocateShipmentCosts,
  useShipmentCostEntries,
  useUpdateCostEntry,
} from '../api';
import { AllocationDrawer } from './AllocationDrawer';

export function AllocateButton({
  shipmentId,
  isFinalised,
}: {
  shipmentId: string;
  isFinalised?: boolean;
}) {
  const allocateMutation = useAllocateShipmentCosts();
  const { data: entries } = useShipmentCostEntries(shipmentId);
  const updateMutation = useUpdateCostEntry();

  const [showDrawer, setShowDrawer] = useState(false);
  const [showBR12Warning, setShowBR12Warning] = useState(false);

  const handleAllocate = async () => {
    try {
      await allocateMutation.mutateAsync(shipmentId);
      // If success, open drawer to show results
      setShowDrawer(true);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      if (typeof msg === 'string' && msg.includes('BR12')) {
        setShowBR12Warning(true);
      } else {
        alert(`Allocation failed: ${msg}`);
      }
    }
  };

  const handleSwitchToByValue = async () => {
    if (!entries) return;

    // Find all entries that are by_weight or by_volume and switch to by_value
    const problematicEntries = entries.filter(
      (e) =>
        e.allocationMethod === 'by_weight' ||
        e.allocationMethod === 'by_volume',
    );

    try {
      // Execute all updates
      await Promise.all(
        problematicEntries.map((entry) =>
          updateMutation.mutateAsync({
            id: entry.id,
            data: { allocationMethod: 'by_value' },
          }),
        ),
      );

      setShowBR12Warning(false);
      // Retry allocation automatically
      handleAllocate();
    } catch (e) {
      alert('Failed to update cost entries.');
    }
  };

  return (
    <>
      <Button
        variant="primary"
        onClick={handleAllocate}
        isLoading={allocateMutation.isPending || updateMutation.isPending}
        disabled={isFinalised || !entries?.length}
      >
        Allocate Costs
      </Button>

      <Modal
        isOpen={showBR12Warning}
        onClose={() => setShowBR12Warning(false)}
        title="BR12: Missing Measurements"
      >
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 mb-6">
          <p className="font-semibold mb-2">
            Cannot allocate by weight or volume.
          </p>
          <p className="text-sm mb-4">
            One or more items in this shipment are missing weight or volume
            measurements. The system cannot accurately distribute costs assigned
            as "by_weight" or "by_volume".
          </p>
          <p className="text-sm">
            Would you like to automatically switch all physical-based cost
            entries to "By Value" and retry?
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowBR12Warning(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSwitchToByValue}
            isLoading={updateMutation.isPending}
          >
            Switch to By Value & Retry
          </Button>
        </div>
      </Modal>

      <AllocationDrawer
        shipmentId={shipmentId}
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
      />
    </>
  );
}
