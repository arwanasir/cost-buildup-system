import React, { useState, useEffect } from 'react';
import { Modal, Input, Button } from '@/components/ui';

interface RateOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, newRate: string) => Promise<void>;
  isLoading: boolean;
}

export function RateOverrideModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: RateOverrideModalProps) {
  const [overrideReason, setOverrideReason] = useState('');
  const [dutyRateOverride, setDutyRateOverride] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverrideReason('');

      setDutyRateOverride('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!overrideReason) return;
    await onSubmit(overrideReason, dutyRateOverride);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Override HS Duty Rate (BR07)"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Customs often disputes HS codes. Provide the official reason and the
          new overridden rate. A mandatory reason is required by business rules.
        </p>
        <Input
          label="New Duty Rate (%)"
          type="number"
          step="0.01"
          value={dutyRateOverride}
          onChange={(e) => setDutyRateOverride(e.target.value)}
        />
        <Input
          label="Override Reason *"
          placeholder="e.g. Disputed at port, official decree #..."
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!overrideReason.trim()}
          >
            Apply Override
          </Button>
        </div>
      </div>
    </Modal>
  );
}
