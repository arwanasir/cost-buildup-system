import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Select,
  DatePicker,
  FxInput,
  Combobox,
} from '@/components/ui';
import { useSuppliers } from '@/features/suppliers/api';
import { usePurchaseOrders } from '@/features/purchase-orders/api';
import { useLatestExchangeRate } from '@/features/exchange-rates/api';
import { useCreateLetterOfCredit } from '../api';
import { formatAmount4 } from '@/lib/money';

const DOC_TYPES = [
  { id: 'bl', label: 'Bill of Lading' },
  { id: 'ci', label: 'Commercial Invoice' },
  { id: 'packing_list', label: 'Packing List' },
  { id: 'coo', label: 'Certificate of Origin' },
  { id: 'inspection_cert', label: 'Inspection Certificate' },
  { id: 'phytosanitary', label: 'Phytosanitary Certificate' },
  { id: 'insurance_cert', label: 'Insurance Certificate' },
  { id: 'other', label: 'Other' },
];

const lcSchema = z
  .object({
    lcNumber: z.string().min(1, 'LC Number is required'),
    supplierId: z.string().min(1, 'Supplier is required'),
    poIds: z.array(z.string()).min(1, 'At least one PO must be selected'),
    issuingBank: z.string().min(1, 'Issuing Bank is required'),
    advisingBank: z.string().optional(),
    lcType: z.enum([
      'sight',
      'usance',
      'deferred_payment',
      'revolving',
      'standby',
    ]),
    currency: z.string().length(3),
    amountForeign: z.number().positive(),
    fxRate: z.number().positive(),
    openingDate: z.string().optional(),
    expiryDate: z.string().min(1, 'Expiry Date is required'),
    lastShipmentDate: z.string().optional(),
    presentationPeriodDays: z.number().min(0).optional(),
    incoterm: z.string().optional(),
    partialShipmentAllowed: z.boolean(),
    transhipmentAllowed: z.boolean(),
    specialConditions: z.string().optional(),
    documents: z.record(z.string(), z.boolean()),
  })
  .refine(
    (data) => {
      if (data.lastShipmentDate && data.expiryDate) {
        return new Date(data.lastShipmentDate) <= new Date(data.expiryDate);
      }
      return true;
    },
    {
      message: 'Last Shipment Date cannot be after Expiry Date',
      path: ['lastShipmentDate'],
    },
  );

type LcFormData = z.infer<typeof lcSchema>;

export function LetterOfCreditForm() {
  const localize = useUiText();
  const navigate = useNavigate();
  const createMutation = useCreateLetterOfCredit();

  // Load suppliers for selection
  const { data: activeSuppliers, isLoading: isLoadingSuppliers } = useSuppliers(
    { isActive: true, limit: 100 },
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LcFormData>({
    resolver: zodResolver(lcSchema),
    defaultValues: {
      lcType: 'sight',
      currency: 'USD',
      poIds: [],
      fxRate: 1,
      partialShipmentAllowed: true,
      transhipmentAllowed: false,
      presentationPeriodDays: 21,
      documents: {
        bl: true,
        ci: true,
        packing_list: true,
        coo: false,
        inspection_cert: false,
        phytosanitary: false,
        insurance_cert: false,
        other: false,
      },
    },
  });

  const watchSupplierId = watch('supplierId');
  const watchCurrency = watch('currency');
  const watchPoIds = watch('poIds') || [];
  const watchAmountForeign = watch('amountForeign');

  // Fetch approved POs for the selected supplier
  const { data: poData, isLoading: isLoadingPos } = usePurchaseOrders({
    limit: 100,
    status: 'approved',
    supplierId: watchSupplierId || undefined,
  });

  const { data: latestRate } = useLatestExchangeRate(watchCurrency);

  useEffect(() => {
    if (latestRate?.rate) {
      setValue('fxRate', parseFloat(latestRate.rate), { shouldValidate: true });
    }
  }, [latestRate, setValue]);

  // BR08: Only show POs that DO NOT have an LC attached yet
  const availablePos = useMemo(
    () => (poData?.data || []).filter((po) => po.lcId === null),
    [poData?.data],
  );

  // Auto-calculate amountForeign when POs are selected
  useEffect(() => {
    let total = 0;
    watchPoIds.forEach((id) => {
      const po = availablePos.find((p) => p.id === id);
      if (po) total += parseFloat(po.totalAmount);
    });
    // Update amount but allow user to override
    if (total > 0 && watchAmountForeign !== total) {
      setValue('amountForeign', total, { shouldValidate: true });
    }
  }, [watchPoIds, availablePos, watchAmountForeign, setValue]);

  const supplierOptions = (activeSuppliers?.data || []).map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const onSubmit = async (data: LcFormData) => {
    try {
      const requiredDocuments = Object.entries(data.documents)
        .filter(([_, isRequired]) => isRequired)
        .map(([docType]) => ({
          documentType: docType,
          isRequired: true,
        }));

      await createMutation.mutateAsync({
        lcNumber: data.lcNumber,
        poIds: data.poIds,
        issuingBank: data.issuingBank,
        advisingBank: data.advisingBank,
        lcType: data.lcType,
        amountForeign: data.amountForeign,
        currency: data.currency,
        fxRate: data.fxRate,
        openingDate: data.openingDate
          ? new Date(data.openingDate).toISOString()
          : undefined,
        expiryDate: new Date(data.expiryDate).toISOString(),
        lastShipmentDate: data.lastShipmentDate
          ? new Date(data.lastShipmentDate).toISOString()
          : undefined,
        presentationPeriodDays: data.presentationPeriodDays,
        incoterm: data.incoterm,
        partialShipmentAllowed: data.partialShipmentAllowed,
        transhipmentAllowed: data.transhipmentAllowed,
        specialConditions: data.specialConditions,
        requiredDocuments,
      });

      navigate('/letters-of-credit');
    } catch (e) {
      console.error('Failed to create LC', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            <LocalizedText
              text={'\n            Create Letter of Credit\n          '}
            />
          </h2>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 divide-y divide-gray-200"
      >
        {/* Core Info & PO Selection */}
        <div className="space-y-6 pt-8 sm:space-y-5 sm:pt-10">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              <LocalizedText
                text={'\n              Primary Configuration\n            '}
              />
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              <LocalizedText
                text={
                  '\n              Select the supplier and link the approved Purchase Orders to\n              bundle into this instrument.\n            '
                }
              />
            </p>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Controller
                name="supplierId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label="Supplier *"
                    options={supplierOptions}
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      setValue('poIds', []); // Reset POs when supplier changes
                    }}
                    error={errors.supplierId?.message}
                    disabled={isLoadingSuppliers}
                  />
                )}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label={localize('LC Number *')}
                {...register('lcNumber')}
                error={errors.lcNumber?.message}
              />
            </div>

            {watchSupplierId && (
              <div className="sm:col-span-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  <LocalizedText
                    text={
                      '\n                  Link Approved Purchase Orders (BR08 Enforced) *\n                '
                    }
                  />
                </label>
                {isLoadingPos ? (
                  <p className="text-sm text-gray-500">
                    <LocalizedText text={'Loading POs...'} />
                  </p>
                ) : availablePos.length === 0 ? (
                  <p className="text-sm text-amber-600 italic">
                    <LocalizedText
                      text={
                        '\n                    No approved POs without LCs found for this supplier.\n                  '
                      }
                    />
                  </p>
                ) : (
                  <Controller
                    name="poIds"
                    control={control}
                    render={({ field }) => {
                      const selectedPoIds = Array.isArray(field.value)
                        ? field.value
                        : field.value
                          ? [field.value]
                          : [];

                      return (
                        <div className="space-y-3">
                          {availablePos.map((po) => {
                            const isSelected = selectedPoIds.includes(po.id);
                            return (
                              <div
                                key={po.id}
                                className="relative flex items-start"
                              >
                                <div className="flex h-5 items-center">
                                  <input
                                    type="checkbox"
                                    value={po.id}
                                    checked={isSelected}
                                    onChange={() =>
                                      field.onChange(
                                        isSelected
                                          ? selectedPoIds.filter(
                                              (id) => id !== po.id,
                                            )
                                          : [...selectedPoIds, po.id],
                                      )
                                    }
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="ml-3 text-sm flex justify-between w-full pr-4">
                                  <label className="font-medium text-gray-700">
                                    {po.poNumber}
                                  </label>
                                  <span className="text-gray-500 font-mono">
                                    {formatAmount4(po.totalAmount)}
                                    <LocalizedText text={' '} />
                                    {po.currency}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {errors.poIds && (
                            <p className="text-sm text-red-600">
                              {errors.poIds.message}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Banking & Financials */}
        <div className="space-y-6 pt-8 sm:space-y-5 sm:pt-10">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              <LocalizedText
                text={'\n              Banking & Financials\n            '}
              />
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Input
                label={localize('Issuing Bank *')}
                {...register('issuingBank')}
                error={errors.issuingBank?.message}
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                label={localize('Advising Bank')}
                {...register('advisingBank')}
                error={errors.advisingBank?.message}
              />
            </div>

            <div className="sm:col-span-2">
              <Select
                label={localize('LC Type *')}
                options={[
                  { label: 'Sight', value: 'sight' },
                  { label: 'Usance', value: 'usance' },
                  { label: 'Deferred Payment', value: 'deferred_payment' },
                  { label: 'Revolving', value: 'revolving' },
                  { label: 'Standby', value: 'standby' },
                ]}
                {...register('lcType')}
                error={errors.lcType?.message}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label={localize('Currency')}
                {...register('currency')}
                error={errors.currency?.message}
              />
            </div>
            <div className="sm:col-span-2">
              <Controller
                name="fxRate"
                control={control}
                render={({ field }) => (
                  <FxInput
                    label="Exchange Rate (FX) *"
                    value={field.value}
                    onChange={(val) => field.onChange(val || 0)}
                    currency={watchCurrency}
                    error={errors.fxRate?.message}
                  />
                )}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label={localize('Total LC Amount (Foreign) *')}
                type="number"
                step="0.01"
                {...register('amountForeign', { valueAsNumber: true })}
                error={errors.amountForeign?.message}
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                label={localize('Incoterm')}
                {...register('incoterm')}
                error={errors.incoterm?.message}
              />
            </div>
          </div>
        </div>

        {/* Dates & Logistics */}
        <div className="space-y-6 pt-8 sm:space-y-5 sm:pt-10">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              <LocalizedText
                text={'\n              Dates & Logistics Rules\n            '}
              />
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <DatePicker
                label={localize('Opening Date')}
                {...register('openingDate')}
                error={errors.openingDate?.message}
              />
            </div>
            <div className="sm:col-span-2">
              <DatePicker
                label={localize('Latest Shipment Date')}
                {...register('lastShipmentDate')}
                error={errors.lastShipmentDate?.message}
              />
            </div>
            <div className="sm:col-span-2">
              <DatePicker
                label={localize('Expiry Date *')}
                {...register('expiryDate')}
                error={errors.expiryDate?.message}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label={localize('Presentation Period (Days)')}
                type="number"
                {...register('presentationPeriodDays', { valueAsNumber: true })}
                error={errors.presentationPeriodDays?.message}
              />
            </div>

            <div className="sm:col-span-2 flex items-center h-full pt-6">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  {...register('partialShipmentAllowed')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label className="font-medium text-gray-700">
                  <LocalizedText
                    text={
                      '\n                  Allow Partial Shipment\n                '
                    }
                  />
                </label>
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center h-full pt-6">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  {...register('transhipmentAllowed')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label className="font-medium text-gray-700">
                  <LocalizedText
                    text={
                      '\n                  Allow Transhipment\n                '
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Documents & Conditions */}
        <div className="space-y-6 pt-8 sm:space-y-5 sm:pt-10">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              <LocalizedText
                text={
                  '\n              Required Documents & Conditions\n            '
                }
              />
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6 bg-white border border-gray-200 shadow-sm rounded-md p-4">
              <legend className="text-sm font-medium text-gray-900 mb-4">
                <LocalizedText
                  text={
                    '\n                Select Required Documents for Presentation\n              '
                  }
                />
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {DOC_TYPES.map((doc) => (
                  <div key={doc.id} className="relative flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        {...register(`documents.${doc.id}` as any)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">
                        {doc.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <LocalizedText
                  text={
                    '\n                Special Conditions (MT700 Field 47A)\n              '
                  }
                />
              </label>
              <textarea
                className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm border-gray-300"
                rows={4}
                {...register('specialConditions')}
              />
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              <LocalizedText text={'\n              Cancel\n            '} />
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              <LocalizedText
                text={'\n              Create Letter of Credit\n            '}
              />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
