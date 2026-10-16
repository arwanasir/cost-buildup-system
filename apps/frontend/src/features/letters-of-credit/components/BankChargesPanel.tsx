import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLcCharges, useAddLcCharge, type LetterOfCredit } from '../api';
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
  const {
    data: chargesData,
    isLoading,
    isError,
    refetch,
  } = useLcCharges(lc.id);
  const addCharge = useAddLcCharge();

  const [showAddForm, setShowAddForm] = useState(false);

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
    try {
      await addCharge.mutateAsync({ id: lc.id, data });
      reset();
      setShowAddForm(false);
    } catch (e) {
      console.error(e);
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
      <ErrorState message="Failed to load charges" onRetry={() => refetch()} />
    );

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Bank Charges & Fees
        </h3>
        <PermissionGate permission="lc:write">
          {!showAddForm && (
            <Button variant="secondary" onClick={() => setShowAddForm(true)}>
              Record Charge
            </Button>
          )}
        </PermissionGate>
      </div>

      {showAddForm && (
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Charge Type *"
                options={allowedChargeTypes}
                {...register('chargeType')}
                error={errors.chargeType?.message}
              />
              <Input
                label="Amount (ETB) *"
                type="number"
                step="0.01"
                {...register('amountEtb', { valueAsNumber: true })}
                error={errors.amountEtb?.message}
              />
              <Input
                label="Date *"
                type="date"
                {...register('chargeDate')}
                error={errors.chargeDate?.message}
              />
              <Input
                label="Bank Reference"
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
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={addCharge.isPending}
              >
                Save Charge
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="px-4 py-5 sm:p-0">
        {charges.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            No bank charges recorded yet.
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
                        Linked to Accounting
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Date: {new Date(charge.chargeDate).toLocaleDateString()}
                    {charge.bankReference && ` | Ref: ${charge.bankReference}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {parseFloat(charge.amountEtb).toLocaleString()} ETB
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
