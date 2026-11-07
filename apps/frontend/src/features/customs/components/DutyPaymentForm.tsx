import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button } from '@/components/ui';
import { formatAmount4 } from '@/lib/money';

const paymentSchema = z.object({
  paymentDate: z.string().min(1, 'Payment date is required'),
  bankReference: z.string().optional(),
  amountPaidEtb: z.number().positive('Amount must be positive'),
  receiptNumber: z.string().min(1, 'Receipt/CPO number is required'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface DutyPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  isLoading: boolean;
  totalAssessmentEtb: string | number;
}

export function DutyPaymentForm({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  totalAssessmentEtb,
}: DutyPaymentFormProps) {
  const localize = useUiText();
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      bankReference: '',
      amountPaidEtb: parseFloat(totalAssessmentEtb.toString()),
      receiptNumber: '',
    },
  });

  const { reset } = form;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        paymentDate: new Date().toISOString().split('T')[0],
        bankReference: '',
        amountPaidEtb: parseFloat(totalAssessmentEtb.toString()),
        receiptNumber: '',
      });
    }
  }, [isOpen, reset, totalAssessmentEtb]);

  const watchedAmount = form.watch('amountPaidEtb');

  const varianceAnalysis = useMemo(() => {
    const assessed = parseFloat(totalAssessmentEtb.toString());
    const paid = watchedAmount || 0;
    if (assessed === 0)
      return { variancePct: 0, isFlagged: false, varianceAmount: 0 };

    const varianceAmount = paid - assessed;
    const variancePct = Math.abs((varianceAmount / assessed) * 100);

    // FR-05.2 Tolerance assumption is 1% (from backend policy 'duty_payment_tolerance_pct')
    const isFlagged = variancePct > 1.0;

    return { variancePct, isFlagged, varianceAmount };
  }, [watchedAmount, totalAssessmentEtb]);

  const handleFormSubmit = async (data: PaymentFormData) => {
    await onSubmit(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={localize('Record Duty Payment (CPO)')}
    >
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-5"
      >
        {varianceAnalysis.isFlagged && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h3 className="text-amber-800 font-bold text-sm uppercase tracking-wide">
              <LocalizedText
                text={'\n              Variance Flag (FR-05.2)\n            '}
              />
            </h3>
            <p className="text-amber-700 text-sm mt-1">
              <LocalizedText text={'\n              The amount paid ('} />
              {formatAmount4(watchedAmount)}{' '}
              <LocalizedText
                text={
                  ' ETB) deviates\n              from the assessed amount (\n              '
                }
              />
              {formatAmount4(totalAssessmentEtb)}{' '}
              <LocalizedText text={' ETB)\n              by '} />
              <strong>{varianceAnalysis.variancePct.toFixed(2)}%</strong>
              <LocalizedText
                text={
                  '.\n              This exceeds the 1% policy tolerance and will automatically flag\n              the payment for audit review upon saving.\n            '
                }
              />
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={localize('Payment Date *')}
            type="date"
            {...form.register('paymentDate')}
            error={form.formState.errors.paymentDate?.message}
          />
          <Input
            label={localize('Amount Paid (ETB) *')}
            type="number"
            step="0.01"
            {...form.register('amountPaidEtb', { valueAsNumber: true })}
            error={form.formState.errors.amountPaidEtb?.message}
          />
          <Input
            label={localize('Bank Reference (CPO #)')}
            {...form.register('bankReference')}
            error={form.formState.errors.bankReference?.message}
          />
          <Input
            label={localize('Customs Receipt Number *')}
            {...form.register('receiptNumber')}
            error={form.formState.errors.receiptNumber?.message}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            <LocalizedText text={'\n            Cancel\n          '} />
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            <LocalizedText text={'\n            Record Payment\n          '} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
