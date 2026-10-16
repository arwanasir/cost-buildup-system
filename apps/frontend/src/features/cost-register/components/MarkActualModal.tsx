import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button } from '@/components/ui';
import { useMarkCostEntryActual, type CostEntry } from '../api';

const formSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  amountForeign: z.number().min(0, 'Amount must be positive'),
  fxRate: z.number().min(0, 'FX Rate must be positive'),
});

type FormData = z.infer<typeof formSchema>;

export function MarkActualModal({
  entry,
  isOpen,
  onClose,
}: {
  entry: CostEntry | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const markActualMutation = useMarkCostEntryActual();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      amountForeign: 0,
      fxRate: 1.0,
    },
  });

  // Pre-fill form when opened
  React.useEffect(() => {
    if (isOpen && entry) {
      form.reset({
        invoiceNumber: entry.invoiceNumber || '',
        invoiceDate:
          entry.invoiceDate || new Date().toISOString().split('T')[0],
        amountForeign: parseFloat(entry.amountForeign) || 0,
        fxRate: parseFloat(entry.fxRate) || 1.0,
      });
    }
  }, [isOpen, entry, form]);

  const amountForeign = form.watch('amountForeign');
  const fxRate = form.watch('fxRate');

  const computedEtb = useMemo(() => {
    return (amountForeign || 0) * (fxRate || 1);
  }, [amountForeign, fxRate]);

  const onSubmit = async (data: FormData) => {
    if (!entry) return;
    try {
      await markActualMutation.mutateAsync({
        id: entry.id,
        data: {
          ...data,
          amountEtb: computedEtb,
        },
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  if (!entry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mark as Actual: ${entry.costCategory?.name || 'Cost'}`}
    >
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        You are converting an estimated accrual (ETB{' '}
        {parseFloat(entry.amountEtb).toLocaleString()}) to an actual finalized
        cost.
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Actual Invoice Number *"
            {...form.register('invoiceNumber')}
            error={form.formState.errors.invoiceNumber?.message}
          />
          <Input
            label="Actual Invoice Date *"
            type="date"
            {...form.register('invoiceDate')}
            error={form.formState.errors.invoiceDate?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Actual Amount (${entry.currency}) *`}
            type="number"
            step="0.01"
            {...form.register('amountForeign', { valueAsNumber: true })}
            error={form.formState.errors.amountForeign?.message}
          />
          <Input
            label="Final FX Rate *"
            type="number"
            step="0.000001"
            {...form.register('fxRate', { valueAsNumber: true })}
            error={form.formState.errors.fxRate?.message}
            disabled={true}
            title="FX Rate is permanently locked once the estimate is saved (BR10)"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-md">
          <span className="text-sm text-green-800 font-medium">
            Final ETB Value:
          </span>
          <span className="text-xl font-bold text-green-900">
            ETB{' '}
            {computedEtb.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={markActualMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={markActualMutation.isPending}
          >
            Confirm Actuals
          </Button>
        </div>
      </form>
    </Modal>
  );
}
