import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button, Select } from '@/components/ui';
import { useCreateCostEntry } from '../api';
import { useCostCategories } from '@/features/cost-categories/api';
import { useLatestExchangeRate } from '@/features/exchange-rates/api';

const formSchema = z.object({
  costCategoryId: z.string().min(1, 'Category is required'),
  costSubcategory: z.string().optional(),
  providerName: z.string().min(1, 'Provider name is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  currency: z.string().min(1, 'Currency is required'),
  amountForeign: z.number().min(0, 'Amount must be positive'),
  fxRate: z.number().min(0, 'FX Rate must be positive'),
  allocationMethod: z.string().min(1, 'Allocation method is required'),
  isEstimated: z.boolean(),
  attachment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function AddCostEntryForm({
  isOpen,
  onClose,
  shipmentId,
}: {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
}) {
  const { data: categories } = useCostCategories();
  const createMutation = useCreateCostEntry();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      costCategoryId: '',
      costSubcategory: '',
      providerName: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      currency: 'ETB',
      amountForeign: 0,
      fxRate: 1.0,
      allocationMethod: 'by_value',
      isEstimated: false,
      attachment: '',
    },
  });

  const selectedCategoryId = form.watch('costCategoryId');
  const currency = form.watch('currency');
  const fxRate = form.watch('fxRate');
  const amountForeign = form.watch('amountForeign');

  // Sync allocation method based on category selection
  useEffect(() => {
    if (selectedCategoryId && categories) {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      if (cat?.defaultAllocationMethod) {
        form.setValue('allocationMethod', cat.defaultAllocationMethod);
      }
    }
  }, [selectedCategoryId, categories, form]);

  // Sync FX rate based on NBE
  const { data: nbeRate } = useLatestExchangeRate(currency);

  useEffect(() => {
    if (currency === 'ETB') {
      form.setValue('fxRate', 1.0);
    } else if (nbeRate?.rate) {
      form.setValue('fxRate', parseFloat(nbeRate.rate));
    }
  }, [currency, nbeRate, form]);

  // Out of tolerance warning (5%)
  const showFxWarning = useMemo(() => {
    if (currency === 'ETB' || !nbeRate?.rate) return false;
    const nbeVal = parseFloat(nbeRate.rate);
    const diffPercent = Math.abs((fxRate - nbeVal) / nbeVal);
    return diffPercent > 0.05; // >5% variance
  }, [fxRate, nbeRate, currency]);

  // Computed ETB
  const computedEtb = useMemo(() => {
    return (amountForeign || 0) * (fxRate || 1);
  }, [amountForeign, fxRate]);

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        id: shipmentId,
        data: {
          ...data,
          amountEtb: computedEtb,
        },
      });
      form.reset();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Cost Entry">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Cost Category *"
            options={
              categories?.map((c) => ({ label: c.name, value: c.id })) || []
            }
            {...form.register('costCategoryId')}
            error={form.formState.errors.costCategoryId?.message}
          />
          <Input
            label="Subcategory (Optional)"
            {...form.register('costSubcategory')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Provider Name *"
            {...form.register('providerName')}
            error={form.formState.errors.providerName?.message}
          />
          <Select
            label="Allocation Method *"
            options={[
              { label: 'By Value', value: 'by_value' },
              { label: 'By Weight', value: 'by_weight' },
              { label: 'By Volume', value: 'by_volume' },
              { label: 'By Quantity', value: 'by_quantity' },
              { label: 'Manual/Direct', value: 'manual' },
            ]}
            {...form.register('allocationMethod')}
            error={form.formState.errors.allocationMethod?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Invoice Number *"
            {...form.register('invoiceNumber')}
            error={form.formState.errors.invoiceNumber?.message}
          />
          <Input
            label="Invoice Date *"
            type="date"
            {...form.register('invoiceDate')}
            error={form.formState.errors.invoiceDate?.message}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 border rounded-md bg-gray-50">
          <div className="col-span-3 pb-2 mb-2 border-b">
            <h4 className="text-sm font-semibold text-gray-700">Financials</h4>
          </div>
          <Select
            label="Currency *"
            options={[
              { label: 'ETB', value: 'ETB' },
              { label: 'USD', value: 'USD' },
              { label: 'EUR', value: 'EUR' },
              { label: 'GBP', value: 'GBP' },
              { label: 'AED', value: 'AED' },
              { label: 'CNY', value: 'CNY' },
            ]}
            {...form.register('currency')}
            error={form.formState.errors.currency?.message}
          />
          <Input
            label="Foreign Amount *"
            type="number"
            step="0.01"
            {...form.register('amountForeign', { valueAsNumber: true })}
            error={form.formState.errors.amountForeign?.message}
          />
          <div>
            <Input
              label="FX Rate *"
              type="number"
              step="0.000001"
              {...form.register('fxRate', { valueAsNumber: true })}
              error={form.formState.errors.fxRate?.message}
              disabled={currency === 'ETB'}
            />
            {showFxWarning && (
              <p className="text-xs text-red-600 mt-1">
                Warning: Rate differs by &gt;5% from official NBE rate (
                {nbeRate?.rate})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-md">
          <span className="text-sm text-blue-800 font-medium">
            Computed ETB Value:
          </span>
          <span className="text-xl font-bold text-blue-900">
            ETB{' '}
            {computedEtb.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              {...form.register('isEstimated')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            Mark as Estimated / Accrual
          </label>
        </div>

        <Input
          label="Attachment URL (Optional)"
          {...form.register('attachment')}
          error={form.formState.errors.attachment?.message}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending}
          >
            Save Cost Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}
