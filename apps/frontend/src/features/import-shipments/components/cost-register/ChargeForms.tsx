import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button } from '@/components/ui';
import { useCreateCostEntry } from '@/features/cost-register/api';
import { useCostCategories } from '@/features/cost-categories/api';

const chargeSchema = z.object({
  providerName: z.string().min(1, 'Provider name is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  amountEtb: z.number().positive('Amount must be positive'),
  attachment: z.string().optional(),
});

type ChargeFormData = z.infer<typeof chargeSchema>;

interface BaseChargeFormProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  categoryCode: string;
  costSubcategory?: string;
  title: string;
}

function GenericChargeForm({
  isOpen,
  onClose,
  shipmentId,
  categoryCode,
  costSubcategory,
  title,
}: BaseChargeFormProps) {
  const { data: categories } = useCostCategories();
  const createMutation = useCreateCostEntry();

  const category = useMemo(() => {
    return categories?.find((c) => c.code === categoryCode);
  }, [categories, categoryCode]);

  const form = useForm<ChargeFormData>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      providerName: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      amountEtb: 0,
      attachment: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        providerName: '',
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        amountEtb: 0,
        attachment: '',
      });
    }
  }, [isOpen, form]);

  const onSubmit = async (data: ChargeFormData) => {
    if (!category) return;
    try {
      await createMutation.mutateAsync({
        id: shipmentId,
        data: {
          shipmentId,
          costCategoryId: category.id,
          costSubcategory,
          providerName: data.providerName,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          amountForeign: data.amountEtb, // Since it's an ETB local charge, foreign=ETB and fxRate=1
          amountEtb: data.amountEtb,
          currency: 'ETB',
          fxRate: 1,
          isEstimated: false,
          attachment: data.attachment,
        },
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {!category ? (
        <div className="text-red-500 p-4">
          Error: Cost category "{categoryCode}" not found in system.
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Provider Name *"
            {...form.register('providerName')}
            error={form.formState.errors.providerName?.message}
          />
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
          <Input
            label="Amount (ETB) *"
            type="number"
            step="0.01"
            {...form.register('amountEtb', { valueAsNumber: true })}
            error={form.formState.errors.amountEtb?.message}
          />
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
              Record Entry
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// Exported specialized wrappers
export const ClearingAgentInvoiceForm = (
  props: Omit<BaseChargeFormProps, 'categoryCode' | 'title'>,
) => (
  <GenericChargeForm
    {...props}
    categoryCode="CLEARING"
    title="Record Clearing Agent Invoice"
  />
);

export const PortChargesForm = (
  props: Omit<BaseChargeFormProps, 'categoryCode' | 'title'>,
) => (
  <GenericChargeForm
    {...props}
    categoryCode="PORT_HANDLING"
    title="Record Port Handling Charges"
  />
);

export const StorageChargesForm = (
  props: Omit<
    BaseChargeFormProps,
    'categoryCode' | 'costSubcategory' | 'title'
  >,
) => (
  <GenericChargeForm
    {...props}
    categoryCode="PORT_HANDLING"
    costSubcategory="Demurrage/Storage"
    title="Record Warehouse/Storage Charges"
  />
);
