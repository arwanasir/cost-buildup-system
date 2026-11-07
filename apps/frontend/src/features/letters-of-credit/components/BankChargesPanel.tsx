import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLcCharges, useAddLcCharge, type LetterOfCredit } from '../api';
import { formatAmount4 } from '@/lib/money';
import {
  Button,
  Input,
  Select,
  Badge,
  Skeleton,
  ErrorState,
  PermissionGate,
} from '@/components/ui';

const chargeSchema = z.object({
  chargeType: z.enum([
    'opening_fee',
    'amendment_fee',
    'advising_confirmation_fee',
    'acceptance_commission',
    'swift',
  ]),
  amountEtb: z.number().positive(),
  chargeDate: z.string().min(1, 'Charge date is required'),
  bankReference: z.string().optional(),
});
type ChargeFormData = z.infer<typeof chargeSchema>;

export function BankChargesPanel({ lc }: { lc: LetterOfCredit }) {
  const localize = useUiText();
  const {
    data: chargesData,
    isLoading,
    isError,
    refetch,
  } = useLcCharges(lc.id);
  const addCharge = useAddLcCharge();

  const [showAddForm, setShowAddForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChargeFormData>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      chargeDate: new Date().toISOString().split('T')[0],
    },
  });

  const charges = chargesData?.data || [];

  const onSubmit = async (data: ChargeFormData) => {
    setSubmitError(null);
    try {
      await addCharge.mutateAsync({ id: lc.id, data });
      reset();
      setShowAddForm(false);
    } catch (e: any) {
      setSubmitError(
        e?.response?.data?.message || e?.message || 'Failed to save bank charge. Please try again.',
      );
    }
  };

  // Determine allowed charge types based on LC type
  const allowedChargeTypes = [
    { label: 'Opening Fee', value: 'opening_fee' },
    { label: 'Amendment Fee', value: 'amendment_fee' },
    { label: 'Advising/Confirmation Fee', value: 'advising_confirmation_fee' },
    { label: 'SWIFT Charge', value: 'swift' },
  ];

  if (lc.lcType === 'usance' || lc.lcType === 'deferred_payment') {
    allowedChargeTypes.push({
      label: 'Acceptance Commission',
      value: 'acceptance_commission',
    });
  }

  if (isLoading) return <Skeleton className="h-[200px]" />;
  if (isError)
    return (
      <ErrorState
        message={localize('Failed to load charges')}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          <LocalizedText text={'\n          Bank Charges & Fees\n        '} />
        </h3>
        <PermissionGate permission="lc:write">
          {!showAddForm && (
            <Button variant="secondary" onClick={() => setShowAddForm(true)}>
              <LocalizedText
                text={'\n              Record Charge\n            '}
              />
            </Button>
          )}
        </PermissionGate>
      </div>

      {showAddForm && (
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label={localize('Charge Type *')}
                options={allowedChargeTypes}
                {...register('chargeType')}
                error={errors.chargeType?.message}
              />
              <Input
                label={localize('Amount (ETB) *')}
                type="number"
                step="0.01"
                {...register('amountEtb', { valueAsNumber: true })}
                error={errors.amountEtb?.message}
              />
              <Input
                label={localize('Date *')}
                type="date"
                {...register('chargeDate')}
                error={errors.chargeDate?.message}
              />
              <Input
                label={localize('Bank Reference')}
                {...register('bankReference')}
                error={errors.bankReference?.message}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setSubmitError(null);
                  reset();
                }}
              >
                <LocalizedText
                  text={'\n                Cancel\n              '}
                />
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={addCharge.isPending}
              >
                <LocalizedText
                  text={'\n                Save Charge\n              '}
                />
              </Button>
            </div>
            {submitError && (
              <p className="text-sm text-red-600 mt-2">{submitError}</p>
            )}
          </form>
        </div>
      )}

      <div className="px-4 py-5 sm:p-0">
        {charges.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            <LocalizedText
              text={'\n            No bank charges recorded yet.\n          '}
            />
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {charges.map((charge: any) => (
              <li
                key={charge.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 uppercase">
                      {charge.chargeType.replace(/_/g, ' ')}
                    </p>
                    {charge.registerEntryId && (
                      <Badge variant="success" className="text-xs">
                        <LocalizedText
                          text={
                            '\n                        Linked to Accounting\n                      '
                          }
                        />
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    <LocalizedText text={'\n                    Date: '} />
                    {new Date(charge.chargeDate).toLocaleDateString()}
                    {charge.bankReference && ` | Ref: ${charge.bankReference}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {formatAmount4(charge.amountEtb)}{' '}
                    <LocalizedText text={' ETB\n                  '} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
