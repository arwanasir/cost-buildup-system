import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
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
  const localize = useUiText();
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
      title={localize('Override HS Duty Rate (BR07)')}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          <LocalizedText
            text={
              '\n          Customs often disputes HS codes. Provide the official reason and the\n          new overridden rate. A mandatory reason is required by business rules.\n        '
            }
          />
        </p>
        <Input
          label={localize('New Duty Rate (%)')}
          type="number"
          step="0.01"
          value={dutyRateOverride}
          onChange={(e) => setDutyRateOverride(e.target.value)}
        />
        <Input
          label={localize('Override Reason *')}
          placeholder={localize('e.g. Disputed at port, official decree #...')}
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            <LocalizedText text={'\n            Cancel\n          '} />
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!overrideReason.trim()}
          >
            <LocalizedText text={'\n            Apply Override\n          '} />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
