import React, { useState } from 'react';
import { Card, Button, Modal, Input } from '@/components/ui';
import {
  useFinalisationCheck,
  useAcceptEstimates,
  useFinaliseShipment,
} from '../api';
import { useAuthStore } from '@/store/auth.store';

export function FinalisationPanel({ shipmentId }: { shipmentId: string }) {
  const { data: blockers, isLoading } = useFinalisationCheck(shipmentId);
  const user = useAuthStore((s) => s.user);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showFinaliseModal, setShowFinaliseModal] = useState(false);
  const [justification, setJustification] = useState('');

  const acceptMutation = useAcceptEstimates();
  const finaliseMutation = useFinaliseShipment();

  const handleAcceptEstimates = async () => {
    if (!justification || justification.length < 10) {
      alert('A detailed justification (min 10 chars) is required for audit.');
      return;
    }
    await acceptMutation.mutateAsync({ id: shipmentId, justification });
    setShowAcceptModal(false);
    setJustification('');
  };

  const handleFinalise = async () => {
    await finaliseMutation.mutateAsync(shipmentId);
    setShowFinaliseModal(false);
  };

  if (isLoading)
    return (
      <div className="p-6 text-center text-gray-500">
        Running finalisation checks...
      </div>
    );

  const isReady = blockers && blockers.length === 0;
  const hasBr05 = blockers?.some((b: string) => b.includes('BR05'));
  const canAcceptEstimates = hasBr05 && user?.role === 'finance_manager';

  return (
    <Card className="p-6 bg-white shadow-sm border mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-gray-500 text-2xl">&#9888;</span>
        Finalisation & ERPSync Gateway
      </h3>

      {isReady ? (
        <div className="bg-green-50 border border-green-200 p-4 rounded-md mb-6 flex items-start gap-3">
          <span className="text-green-600 font-bold text-xl">&#10003;</span>
          <div>
            <h4 className="font-bold text-green-800">Clear for Finalisation</h4>
            <p className="text-sm text-green-700">
              All BR guards passed. The mathematical ledger balances. This
              shipment is ready to be locked and pushed to the ERP Inventory
              ledger.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-red-600 font-bold text-xl">&#9888;</span>
            <h4 className="font-bold text-red-800">
              Finalisation Blockers Detected
            </h4>
          </div>
          <ul className="list-disc pl-10 space-y-2 text-sm text-red-700">
            {blockers.map((blocker: string, idx: number) => (
              <li key={idx}>
                {blocker}
                {blocker.includes('BR05') && canAcceptEstimates && (
                  <Button
                    variant="secondary"

                    className="ml-4 bg-white text-xs border-red-200 hover:bg-red-100 text-red-700"
                    onClick={() => setShowAcceptModal(true)}
                  >
                    Accept Estimates
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="primary"
          onClick={() => setShowFinaliseModal(true)}
          disabled={!isReady}
        >
          Finalise Shipment
        </Button>
      </div>

      {/* Accept Estimates Modal */}
      <Modal
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        title="Accept Estimated Costs (BR05 Override)"
      >
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 mb-6 text-sm">
          <strong>Finance Manager Override</strong>
          <p className="mt-1">
            You are choosing to bypass BR05 and mathematically treat all
            un-invoiced Estimates as Actuals. This locks the estimates in the
            ledger. A formal justification is required for the audit trail.
          </p>
        </div>
        <div className="space-y-4">
          <Input
            label="Justification for Audit Trail *"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="e.g. Cleared by executive committee for month-end close..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowAcceptModal(false)}
              disabled={acceptMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleAcceptEstimates}
              isLoading={acceptMutation.isPending}
            >
              Override & Accept
            </Button>
          </div>
        </div>
      </Modal>

      {/* Finalise Confirm Modal */}
      <Modal
        isOpen={showFinaliseModal}
        onClose={() => setShowFinaliseModal(false)}
        title="Finalise Shipment (BR02)"
      >
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 mb-6 text-sm">
          <strong>IRREVERSIBLE ACTION</strong>
          <p className="mt-1">
            You are about to cryptographically sign and lock this cost buildup.
            No further costs can be added or modified. The mathematically
            derived Unit Costs will be immediately pushed to the Inventory
            Ledger (SRS 5.6).
          </p>
          <p className="mt-2 font-bold">
            Are you absolutely sure you want to proceed?
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => setShowFinaliseModal(false)}
            disabled={finaliseMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleFinalise}
            isLoading={finaliseMutation.isPending}
          >
            Sign & Finalise
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
