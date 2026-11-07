import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { Card, Button, Modal, Input } from '@/components/ui';
import {
  useFinalisationCheck,
  useAcceptEstimates,
  useFinaliseShipment,
} from '../api';
import { useAuthStore } from '@/store/auth.store';

export function FinalisationPanel({ shipmentId }: { shipmentId: string }) {
  const localize = useUiText();
  const {
    data: finalisationCheck,
    isLoading,
    isError,
  } = useFinalisationCheck(shipmentId);
  const blockers = finalisationCheck?.blockers ?? [];
  const user = useAuthStore((s) => s.user);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showFinaliseModal, setShowFinaliseModal] = useState(false);
  const [justification, setJustification] = useState('');
  const [justificationError, setJustificationError] = useState('');

  const acceptMutation = useAcceptEstimates();
  const finaliseMutation = useFinaliseShipment();

  const handleAcceptEstimates = async () => {
    if (!justification || justification.length < 10) {
      setJustificationError(
        localize('A detailed justification (min 10 characters) is required for the audit trail.'),
      );
      return;
    }
    setJustificationError('');
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
        <LocalizedText
          text={'\n        Running finalisation checks...\n      '}
        />
      </div>
    );

  const isReady = finalisationCheck?.canFinalise ?? false;
  const hasBr05 = blockers?.some((b: string) => b.includes('BR05'));
  const canAcceptEstimates = hasBr05 && user?.role === 'finance_manager';

  return (
    <Card className="p-6 bg-white shadow-sm border mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-gray-500 text-2xl">&#9888;</span>
        <LocalizedText
          text={'\n        Finalisation & ERPSync Gateway\n      '}
        />
      </h3>

      {isError ? (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-6 text-sm text-red-700">
          <LocalizedText
            text={'Unable to load landed-cost finalisation checks.'}
          />
        </div>
      ) : isReady ? (
        <div className="bg-green-50 border border-green-200 p-4 rounded-md mb-6 flex items-start gap-3">
          <span className="text-green-600 font-bold text-xl">&#10003;</span>
          <div>
            <h4 className="font-bold text-green-800">
              <LocalizedText text={'Clear for Finalisation'} />
            </h4>
            <p className="text-sm text-green-700">
              <LocalizedText
                text={
                  '\n              All BR guards passed. The mathematical ledger balances. This\n              shipment is ready to be locked and pushed to the ERP Inventory\n              ledger.\n            '
                }
              />
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-red-600 font-bold text-xl">&#9888;</span>
            <h4 className="font-bold text-red-800">
              <LocalizedText
                text={
                  '\n              Finalisation Blockers Detected\n            '
                }
              />
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
                    <LocalizedText
                      text={
                        '\n                    Accept Estimates\n                  '
                      }
                    />
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
          <LocalizedText text={'\n          Finalise Shipment\n        '} />
        </Button>
      </div>

      {/* Accept Estimates Modal */}
      <Modal
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        title={localize('Accept Estimated Costs (BR05 Override)')}
      >
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 mb-6 text-sm">
          <strong>
            <LocalizedText text={'Finance Manager Override'} />
          </strong>
          <p className="mt-1">
            <LocalizedText
              text={
                '\n            You are choosing to bypass BR05 and mathematically treat all\n            un-invoiced Estimates as Actuals. This locks the estimates in the\n            ledger. A formal justification is required for the audit trail.\n          '
              }
            />
          </p>
        </div>
        <div className="space-y-4">
          <Input
            label={localize('Justification for Audit Trail *')}
            value={justification}
            onChange={(e) => {
              setJustification(e.target.value);
              if (justificationError) setJustificationError('');
            }}
            placeholder={localize(
              'e.g. Cleared by executive committee for month-end close...',
            )}
          />
          {justificationError && (
            <p role="alert" className="text-sm text-red-600 font-medium">
              {justificationError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAcceptModal(false);
                setJustificationError('');
              }}
              disabled={acceptMutation.isPending}
            >
              <LocalizedText text={'\n              Cancel\n            '} />
            </Button>
            <Button
              variant="danger"
              onClick={handleAcceptEstimates}
              isLoading={acceptMutation.isPending}
            >
              <LocalizedText
                text={'\n              Override & Accept\n            '}
              />
            </Button>
          </div>
        </div>
      </Modal>

      {/* Finalise Confirm Modal */}
      <Modal
        isOpen={showFinaliseModal}
        onClose={() => setShowFinaliseModal(false)}
        title={localize('Finalise Shipment (BR02)')}
      >
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 mb-6 text-sm">
          <strong>
            <LocalizedText text={'IRREVERSIBLE ACTION'} />
          </strong>
          <p className="mt-1">
            <LocalizedText
              text={
                '\n            You are about to cryptographically sign and lock this cost buildup.\n            No further costs can be added or modified. The mathematically\n            derived Unit Costs will be immediately pushed to the Inventory\n            Ledger (SRS 5.6).\n          '
              }
            />
          </p>
          <p className="mt-2 font-bold">
            <LocalizedText
              text={
                '\n            Are you absolutely sure you want to proceed?\n          '
              }
            />
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => setShowFinaliseModal(false)}
            disabled={finaliseMutation.isPending}
          >
            <LocalizedText text={'\n            Cancel\n          '} />
          </Button>
          <Button
            variant="danger"
            onClick={handleFinalise}
            isLoading={finaliseMutation.isPending}
          >
            <LocalizedText text={'\n            Sign & Finalise\n          '} />
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
