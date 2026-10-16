import React, { useState } from 'react';
import { useSettings, useUpdateSetting, type Setting } from '../api';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  ConfirmDialog,
  Skeleton,
  ErrorState,
} from '@/components/ui';

const SETTING_METADATA: Record<
  string,
  { label: string; isNumeric: boolean; impact: string }
> = {
  po_approval_threshold_1: {
    label: 'PO Approval Tier 1 Threshold',
    isNumeric: true,
    impact:
      'Modifying this changes the financial boundary for Tier 1 vs Tier 2 PO approval routing. Existing unapproved POs will be subject to the new rule.',
  },
  po_approval_threshold_2: {
    label: 'PO Approval Tier 2 Threshold',
    isNumeric: true,
    impact:
      'Modifying this changes the financial boundary for Tier 2 vs Tier 3 PO approval routing. High value POs may bypass managers.',
  },
  lc_gm_threshold: {
    label: 'LC General Manager Threshold',
    isNumeric: true,
    impact:
      'Changing this modifies the boundary for which Letters of Credit require explicit General Manager approval.',
  },
  variance_threshold_pct: {
    label: 'Cost Variance Threshold (%)',
    isNumeric: true,
    impact:
      'Modifying this affects the auto-approval boundary for price variances on Goods Receipts. Larger variances will require manual approval.',
  },
  fx_tolerance_pct: {
    label: 'FX Rate Tolerance (%)',
    isNumeric: true,
    impact:
      'Changes how strictly NBE FX rates are enforced against Bank Charges and Letters of Credit transactions.',
  },
  ci_price_variance_pct: {
    label: 'Commercial Invoice Price Variance (%)',
    isNumeric: true,
    impact:
      'Alters the allowed variance between PO unit prices and Commercial Invoice unit prices.',
  },
  duty_payment_tolerance_pct: {
    label: 'Duty Payment Tolerance (%)',
    isNumeric: true,
    impact:
      'Affects the strictness of mapping assessed customs declarations vs actual paid duty amounts.',
  },
  po_number_prefix: {
    label: 'Purchase Order Prefix',
    isNumeric: false,
    impact:
      'Changes the auto-generated numbering scheme for new Purchase Orders. Will not affect historical data.',
  },
  shipment_number_prefix: {
    label: 'Shipment Prefix',
    isNumeric: false,
    impact:
      'Changes the auto-generated numbering scheme for new Import Shipments.',
  },
  grn_number_prefix: {
    label: 'Goods Receipt Prefix',
    isNumeric: false,
    impact:
      'Changes the auto-generated numbering scheme for new Goods Receipts.',
  },
};

export function SettingsPage() {
  const queryClient = useQueryClient();

  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');

  const { data: settings, isLoading, isError, refetch } = useSettings();
  const updateMutation = useUpdateSetting();

  const handleEditClick = (setting: Setting) => {
    setEditingSetting(setting);
    const meta = SETTING_METADATA[setting.key];
    if (meta?.isNumeric) {
      setDraftValue(setting.valueNumeric || '');
    } else {
      setDraftValue(setting.valueText || '');
    }
  };

  const handleConfirm = () => {
    if (!editingSetting) return;

    const meta = SETTING_METADATA[editingSetting.key];
    const payload: any = { key: editingSetting.key };

    if (meta?.isNumeric) {
      payload.valueNumeric = parseFloat(draftValue);
    } else {
      payload.valueText = draftValue;
    }

    updateMutation.mutate(payload, {
      onSuccess: () => setEditingSetting(null),
    });
  };

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (isError)
    return (
      <ErrorState
        message="Failed to load system settings"
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          System Parameters & Policies
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Configure global limits, thresholds, and auto-generation prefixes.
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Application Configuration
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            {(settings || []).map((setting, idx) => {
              const meta = SETTING_METADATA[setting.key];
              if (!meta) return null; // Hide internal or unknown settings

              const displayValue = meta.isNumeric
                ? setting.valueNumeric
                : setting.valueText;

              return (
                <div
                  key={setting.id}
                  className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center`}
                >
                  <dt className="text-sm font-medium text-gray-500">
                    {meta.label}
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {setting.key}
                    </p>
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1 font-semibold text-right sm:text-left">
                    {displayValue || '-'}
                  </dd>
                  <dd className="mt-1 text-sm sm:mt-0 sm:col-span-1 text-right">
                    <Button
                      variant="secondary"
                      onClick={() => handleEditClick(setting)}
                    >
                      Edit Value
                    </Button>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      {editingSetting && (
        <ConfirmDialog
          isOpen={true}
          title={`Update ${SETTING_METADATA[editingSetting.key]?.label}`}
          message="Please provide the new value for this parameter."
          impactMessage={SETTING_METADATA[editingSetting.key]?.impact}
          confirmText="Apply Setting"
          isLoading={updateMutation.isPending}
          onConfirm={handleConfirm}
          onClose={() => setEditingSetting(null)}
        >
          <div className="mt-4 mb-2">
            <Input
              type={
                SETTING_METADATA[editingSetting.key]?.isNumeric
                  ? 'number'
                  : 'text'
              }
              step={
                SETTING_METADATA[editingSetting.key]?.isNumeric
                  ? '0.0001'
                  : undefined
              }
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              placeholder="Enter new value"
            />
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
