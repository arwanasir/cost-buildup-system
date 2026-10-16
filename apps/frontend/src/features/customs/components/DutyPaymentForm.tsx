import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button } from '@/components/ui';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Record Duty Payment (CPO)">
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-5"
      >
        {varianceAnalysis.isFlagged && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h3 className="text-amber-800 font-bold text-sm uppercase tracking-wide">
              Variance Flag (FR-05.2)
            </h3>
            <p className="text-amber-700 text-sm mt-1">
              The amount paid ({watchedAmount.toLocaleString()} ETB) deviates
              from the assessed amount (
              {parseFloat(totalAssessmentEtb.toString()).toLocaleString()} ETB)
              by <strong>{varianceAnalysis.variancePct.toFixed(2)}%</strong>.
              This exceeds the 1% policy tolerance and will automatically flag
              the payment for audit review upon saving.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Payment Date *"
            type="date"
            {...form.register('paymentDate')}
            error={form.formState.errors.paymentDate?.message}
          />
          <Input
            label="Amount Paid (ETB) *"
            type="number"
            step="0.01"
            {...form.register('amountPaidEtb', { valueAsNumber: true })}
            error={form.formState.errors.amountPaidEtb?.message}
          />
          <Input
            label="Bank Reference (CPO #)"
            {...form.register('bankReference')}
            error={form.formState.errors.bankReference?.message}
          />
          <Input
            label="Customs Receipt Number *"
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
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
