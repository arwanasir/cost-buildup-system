import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { useSettings, useUpdateSetting, type Setting } from '../api';
import {
  Button,
  Input,
  ConfirmDialog,
  Skeleton,
  ErrorState,
} from '@/components/ui';

const SETTING_METADATA: Record<
  string,
  { label: string; isNumeric: boolean; impact: string; canonicalKey?: string }
> = {
  po_approval_threshold_1: {
    label: 'PO Approval Tier 1 Threshold (ETB)',
    isNumeric: true,
    impact:
      'Modifying this changes the financial boundary for Tier 1 vs Tier 2 PO approval routing. Existing unapproved POs will be subject to the new rule.',
  },
  po_approval_threshold_2: {
    label: 'PO Approval Tier 2 Threshold (ETB)',
    isNumeric: true,
    impact:
      'Modifying this changes the financial boundary for Tier 2 vs Tier 3 PO approval routing. High value POs may bypass managers.',
  },
  lc_gm_threshold: {
    label: 'LC General Manager Approval Threshold (ETB)',
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
      'Changes the permitted difference between a transaction exchange rate and the reference rate.',
  },
  ci_price_variance_pct: {
    label: 'Commercial Invoice Price Variance (%)',
    isNumeric: true,
    impact:
      'Changes the threshold for flagging differences between PO and commercial invoice prices.',
  },
  duty_payment_tolerance_pct: {
    label: 'Duty Payment Tolerance (%)',
    isNumeric: true,
    impact:
      'Changes the threshold used to flag differences between assessed and paid customs duty.',
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
  lc_number_prefix: {
    label: 'Letter of Credit Prefix',
    isNumeric: false,
    impact:
      'Changes the auto-generated numbering scheme for new Letters of Credit. Will not affect historical data.',
  },
  claim_number_prefix: {
    label: 'Claim Number Prefix',
    isNumeric: false,
    impact: 'Changes the numbering prefix for new claims only.',
  },
  default_currency: {
    label: 'Default Currency',
    isNumeric: false,
    impact:
      'Changes the default currency used when a form does not specify one.',
  },
  // Support databases created by the earlier camelCase settings seed.
  costVarianceThresholdPct: {
    label: 'Cost Variance Threshold (%)',
    isNumeric: true,
    impact:
      'Changes the auto-approval boundary for cost variances. Larger variances require manual approval.',
    canonicalKey: 'variance_threshold_pct',
  },
  fxToleranceThresholdPct: {
    label: 'FX Rate Tolerance (%)',
    isNumeric: true,
    impact:
      'Changes the permitted difference between a transaction exchange rate and the reference rate.',
    canonicalKey: 'fx_tolerance_pct',
  },
  ciVarianceThresholdPct: {
    label: 'Commercial Invoice Price Variance (%)',
    isNumeric: true,
    impact:
      'Changes the threshold for flagging differences between PO and commercial invoice prices.',
    canonicalKey: 'ci_price_variance_pct',
  },
  poPrefix: {
    label: 'Purchase Order Prefix',
    isNumeric: false,
    impact: 'Changes the numbering prefix for new purchase orders only.',
    canonicalKey: 'po_number_prefix',
  },
  shipmentPrefix: {
    label: 'Shipment Prefix',
    isNumeric: false,
    impact: 'Changes the numbering prefix for new shipments only.',
    canonicalKey: 'shipment_number_prefix',
  },
  grnPrefix: {
    label: 'Goods Receipt Prefix',
    isNumeric: false,
    impact: 'Changes the numbering prefix for new goods receipts only.',
    canonicalKey: 'grn_number_prefix',
  },
  lcPrefix: {
    label: 'Letter of Credit Prefix',
    isNumeric: false,
    impact: 'Changes the numbering prefix for new letters of credit only.',
    canonicalKey: 'lc_number_prefix',
  },
  claimPrefix: {
    label: 'Claim Number Prefix',
    isNumeric: false,
    impact: 'Changes the numbering prefix for new claims only.',
    canonicalKey: 'claim_number_prefix',
  },
  defaultCurrency: {
    label: 'Default Currency',
    isNumeric: false,
    impact:
      'Changes the default currency used when a form does not specify one.',
    canonicalKey: 'default_currency',
  },
};

export function SettingsPage() {
  const localize = useUiText();

  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const { data: settings, isLoading, isError, refetch } = useSettings();
  const updateMutation = useUpdateSetting();

  const handleEditClick = (setting: Setting) => {
    if (
      setting.key in SETTING_METADATA &&
      SETTING_METADATA[setting.key].canonicalKey
    ) {
      const canonicalKey = SETTING_METADATA[setting.key].canonicalKey!;
      const canonicalSetting = settings?.find(
        (entry) => entry.key === canonicalKey,
      );
      if (canonicalSetting) {
        setting = canonicalSetting;
      }
    }
    setEditingSetting(setting);
    setDraftError(null);
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
    if (
      meta?.isNumeric &&
      (!draftValue.trim() ||
        !Number.isFinite(Number(draftValue)) ||
        Number(draftValue) < 0)
    ) {
      setDraftError('Enter a valid non-negative number.');
      return;
    }
    if (!meta?.isNumeric && !draftValue.trim()) {
      setDraftError('This value is required.');
      return;
    }
    setDraftError(null);
    const hasCanonicalSetting = settings?.some(
      (setting) => setting.key === meta?.canonicalKey,
    );
    const key = hasCanonicalSetting
      ? meta?.canonicalKey || editingSetting.key
      : editingSetting.key;
    const payload: any = { key };

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
        message={localize('Failed to load system settings')}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          <LocalizedText text={'System Parameters & Policies'} />
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          <LocalizedText
            text={
              'Configure global limits, thresholds, and auto-generation prefixes.'
            }
          />
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            <LocalizedText text={'Application Configuration'} />
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            {(settings || [])
              .filter((setting) => {
                const meta = SETTING_METADATA[setting.key];
                return (
                  meta &&
                  (!meta.canonicalKey ||
                    !settings?.some((entry) => entry.key === meta.canonicalKey))
                );
              })
              .map((setting, idx) => {
                const meta = SETTING_METADATA[setting.key];
                if (!meta) return null;

                const displayValue = meta.isNumeric
                  ? setting.valueNumeric
                  : setting.valueText;

                return (
                  <div
                    key={setting.id}
                    className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center`}
                  >
                    <dt className="text-sm font-medium text-gray-500">
                      <LocalizedText text={meta.label} />
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
                        <LocalizedText text={'Edit Value'} />
                      </Button>
                    </dd>
                  </div>
                );
              })}
            {(!settings ||
              settings.filter((setting) => SETTING_METADATA[setting.key])
                .length === 0) && (
              <div className="px-6 py-8 text-sm text-gray-600">
                <LocalizedText
                  text={'No configurable settings are available.'}
                />
              </div>
            )}
          </dl>
        </div>
      </div>

      {editingSetting && (
        <ConfirmDialog
          isOpen={true}
          title={localize('Update setting')}
          message={localize('Please provide the new value for this parameter.')}
          impactMessage={localize(
            SETTING_METADATA[editingSetting.key]?.impact || '',
          )}
          confirmText={localize('Apply Setting')}
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
              placeholder={localize('Enter new value')}
              min={
                SETTING_METADATA[editingSetting.key]?.isNumeric
                  ? '0'
                  : undefined
              }
              required
            />
            {draftError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {localize(draftError)}
              </p>
            )}
            {updateMutation.isError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                <LocalizedText
                  text={'Failed to update setting. Please try again.'}
                />
              </p>
            )}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
