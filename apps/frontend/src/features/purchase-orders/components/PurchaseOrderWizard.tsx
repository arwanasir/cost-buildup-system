import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Decimal from 'decimal.js';
import {
  Modal,
  Button,
  Input,
  Select,
  Combobox,
  DatePicker,
  FxInput,
  Stepper,
  DualAmount,
  ConfirmDialog,
  FormError,
} from '@/components/ui';
import { useSuppliers } from '@/features/suppliers/api';
import { useLatestExchangeRate } from '@/features/exchange-rates/api';
import { useSettings } from '@/features/settings/api';
import { useSearchItems, type Item } from '@/features/items/api';
import { useTariffs } from '@/features/tariffs/api';
import { useCreatePurchaseOrder, useSubmitPo } from '../api';

const poWizardSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  poDate: z.string().min(1, 'PO Date is required'),
  incoterm: z.enum(['FOB', 'CIF', 'EXW', 'CFR', 'CPT', 'DAP']),
  countryOfOrigin: z.string().optional(),
  estimatedShipmentDate: z.string().optional(),
  estimatedArrivalDate: z.string().optional(),
  currency: z.string().length(3),
  fxRate: z.number().positive(),
  portOfLoading: z.string().optional(),
  portOfDestination: z.string().optional(),
  notes: z.string().optional(),

  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Item required'),
        description: z.string().optional(),
        quantity: z.number().positive(),
        unitOfMeasure: z.string().min(1),
        unitPrice: z.number().positive(),
        hsCode: z.string().optional(),
        estimatedDutyRate: z.number().min(0).optional(),
      }),
    )
    .min(1, 'At least one line item is required'),

  estimatedFreightEtb: z.number().min(0).optional(),
  estimatedInsuranceEtb: z.number().min(0).optional(),
  estimatedOtherChargesEtb: z.number().min(0).optional(),
});

type PoFormData = z.infer<typeof poWizardSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const INCOTERMS = [
  { label: 'FOB - Free On Board', value: 'FOB' },
  { label: 'CIF - Cost, Insurance & Freight', value: 'CIF' },
  { label: 'EXW - Ex Works', value: 'EXW' },
  { label: 'CFR - Cost and Freight', value: 'CFR' },
  { label: 'CPT - Carriage Paid To', value: 'CPT' },
  { label: 'DAP - Delivered at Place', value: 'DAP' },
];

function ItemCombobox({
  value,
  onChange,
  onSelectFullItem,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectFullItem: (item: Item) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const { data: items } = useSearchItems(query);

  const options = (items || []).map((i) => ({
    label: `${i.itemCode} - ${i.name}`,
    value: i.id,
  }));

  if (value && !options.find((o) => o.value === value)) {
    options.push({ label: 'Selected Item...', value });
  }

  return (
    <Combobox
      options={options}
      value={value}
      onChange={(val) => {
        onChange(val);
        const item = (items || []).find((i) => i.id === val);
        if (item) onSelectFullItem(item);
      }}
      onInputChange={setQuery}
      error={error}
    />
  );
}

export function PurchaseOrderWizard({ isOpen, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState<PoFormData | null>(null);

  // Queries
  const { data: activeSuppliers, isLoading: isLoadingSuppliers } = useSuppliers(
    { isActive: true, limit: 100 },
  );
  const { data: settings } = useSettings();
  const { data: tariffs } = useTariffs();

  const fxToleranceSetting = settings?.find(
    (s: any) => s.key === 'fx_tolerance_pct',
  )?.valueNumeric;
  const fxTolerancePct = fxToleranceSetting
    ? parseFloat(fxToleranceSetting)
    : 5;

  const threshold1Setting = settings?.find(
    (s: any) => s.key === 'po_approval_threshold_1',
  )?.valueNumeric;
  const threshold2Setting = settings?.find(
    (s: any) => s.key === 'po_approval_threshold_2',
  )?.valueNumeric;
  const threshold1 = threshold1Setting ? parseFloat(threshold1Setting) : 50000;
  const threshold2 = threshold2Setting ? parseFloat(threshold2Setting) : 100000;

  const createMutation = useCreatePurchaseOrder();
  const submitMutation = useSubmitPo();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PoFormData>({
    resolver: zodResolver(poWizardSchema),
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const watchSupplierId = watch('supplierId');
  const watchCurrency = watch('currency');
  const watchFxRate = watch('fxRate');
  const lines = watch('lines') || [];

  const watchFreight = watch('estimatedFreightEtb');
  const watchInsurance = watch('estimatedInsuranceEtb');

  const { data: latestRate } = useLatestExchangeRate(watchCurrency);
  const { data: latestUsdRate } = useLatestExchangeRate('USD');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      reset({
        supplierId: '',
        poDate: new Date().toISOString().split('T')[0],
        incoterm: 'FOB',
        countryOfOrigin: '',
        estimatedShipmentDate: '',
        estimatedArrivalDate: '',
        currency: 'USD',
        fxRate: 1,
        portOfLoading: '',
        portOfDestination: '',
        notes: '',
        lines: [
          { itemId: '', quantity: 0, unitOfMeasure: 'PCS', unitPrice: 0 },
        ],
        estimatedFreightEtb: 0,
        estimatedInsuranceEtb: 0,
        estimatedOtherChargesEtb: 0,
      });
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (watchSupplierId && activeSuppliers?.data) {
      const selectedSupplier = activeSuppliers.data.find(
        (s: any) => s.id === watchSupplierId,
      );
      if (selectedSupplier?.defaultCurrency) {
        setValue('currency', selectedSupplier.defaultCurrency, {
          shouldValidate: true,
        });
        if (selectedSupplier.country)
          setValue('countryOfOrigin', selectedSupplier.country);
      }
    }
  }, [watchSupplierId, activeSuppliers, setValue]);

  useEffect(() => {
    if (latestRate && latestRate.rate) {
      setValue('fxRate', parseFloat(latestRate.rate), { shouldValidate: true });
    } else if (watchCurrency === 'ETB') {
      setValue('fxRate', 1, { shouldValidate: true });
    }
  }, [latestRate, watchCurrency, setValue]);

  const onNext = () => setStep(step + 1);

  const onFinalSubmit = async (
    data: PoFormData,
    submitType: 'draft' | 'submit',
  ) => {
    try {
      setIsSubmitting(true);

      const payload = {
        supplierId: data.supplierId,
        poDate: new Date(data.poDate).toISOString(),
        incoterm: data.incoterm,
        countryOfOrigin: data.countryOfOrigin,
        estimatedShipmentDate: data.estimatedShipmentDate
          ? new Date(data.estimatedShipmentDate).toISOString()
          : undefined,
        estimatedArrivalDate: data.estimatedArrivalDate
          ? new Date(data.estimatedArrivalDate).toISOString()
          : undefined,
        currency: data.currency,
        fxRate: data.fxRate,
        portOfLoading: data.portOfLoading,
        portOfDestination: data.portOfDestination,
        notes: data.notes,
        estimatedFreightEtb: data.estimatedFreightEtb || 0,
        estimatedInsuranceEtb: data.estimatedInsuranceEtb || 0,
        estimatedOtherChargesEtb: data.estimatedOtherChargesEtb || 0,
        lines: data.lines.map((l) => ({
          itemId: l.itemId,
          description: l.description,
          quantity: l.quantity,
          unitOfMeasure: l.unitOfMeasure,
          unitPrice: l.unitPrice,
          hsCode: l.hsCode,
          estimatedDutyRate: l.estimatedDutyRate || 0,
        })),
      };

      const res = await createMutation.mutateAsync(payload as any);

      if (submitType === 'submit' && res?.data?.id) {
        await submitMutation.mutateAsync(res.data.id);
      }

      onClose();
    } catch (e) {
      console.error('Failed to create PO', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const supplierOptions = (activeSuppliers?.data || []).map((s: any) => ({
    label: `${s.name} (${s.country || 'Unknown'})`,
    value: s.id,
  }));

  let fxWarning = null;
  if (latestRate && watchFxRate) {
    const officialRate = parseFloat(latestRate.rate);
    const diff = Math.abs(watchFxRate - officialRate);
    const diffPct = (diff / officialRate) * 100;
    if (diffPct > fxTolerancePct) {
      fxWarning = `Warning: Entered rate diverges by ${diffPct.toFixed(2)}% from NBE official rate (${officialRate}). Threshold is ${fxTolerancePct}%.`;
    }
  }

  // Cost Computations
  const totalFobFcx = lines.reduce(
    (acc, line) =>
      acc.plus(new Decimal(line.quantity || 0).mul(line.unitPrice || 0)),
    new Decimal(0),
  );
  const totalFobEtb = totalFobFcx.mul(watchFxRate || 1);
  const freightEtb = watchFreight || 0;
  const insuranceEtb = watchInsurance || 0;

  const totalCifEtb = totalFobEtb.plus(freightEtb).plus(insuranceEtb);

  let totalDutyPreview = new Decimal(0);
  lines.forEach((line) => {
    const lineFobFcx = new Decimal(line.quantity || 0).mul(line.unitPrice || 0);
    const ratio = totalFobFcx.isZero()
      ? new Decimal(0)
      : lineFobFcx.div(totalFobFcx);

    const lineFobEtb = lineFobFcx.mul(watchFxRate || 1);
    const lineFreightEtb = new Decimal(freightEtb).mul(ratio);
    const lineInsuranceEtb = new Decimal(insuranceEtb).mul(ratio);

    const lineCifEtb = lineFobEtb.plus(lineFreightEtb).plus(lineInsuranceEtb);
    const dutyRate = new Decimal(line.estimatedDutyRate || 0).div(100);

    totalDutyPreview = totalDutyPreview.plus(lineCifEtb.mul(dutyRate));
  });

  // Approver Determination
  let usdEquivalent = new Decimal(0);
  if (watchCurrency === 'USD') {
    usdEquivalent = totalFobFcx;
  } else if (latestUsdRate?.rate) {
    usdEquivalent = totalFobEtb.div(parseFloat(latestUsdRate.rate));
  }

  let requiredRole = 'Finance Officer';
  if (usdEquivalent.gte(threshold1) && usdEquivalent.lt(threshold2)) {
    requiredRole = 'Finance Manager';
  } else if (usdEquivalent.gte(threshold2)) {
    requiredRole = 'General Manager';
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Order Creation Wizard"
      size="5xl"
    >
      <div className="mb-6">
        <Stepper
          steps={[
            {
              id: 'header',
              label: 'PO Header',
              status:
                step === 1 ? 'current' : step > 1 ? 'complete' : 'upcoming',
            },
            {
              id: 'lines',
              label: 'Line Items',
              status:
                step === 2 ? 'current' : step > 2 ? 'complete' : 'upcoming',
            },
            {
              id: 'costs',
              label: 'Estimated Costs',
              status:
                step === 3 ? 'current' : step > 3 ? 'complete' : 'upcoming',
            },
            {
              id: 'review',
              label: 'Review & Submit',
              status:
                step === 4 ? 'current' : step > 4 ? 'complete' : 'upcoming',
            },
          ]}
        />
      </div>

      <form
        onSubmit={
          step === 4
            ? (e) => e.preventDefault()
            : (e) => {
                e.preventDefault();
                onNext();
              }
        }
        className="space-y-6"
      >
        <FormError error={createMutation.error || submitMutation.error} />
        {/* Step 1: Header */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <Controller
              name="supplierId"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="Supplier *"
                  options={supplierOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.supplierId?.message}
                  disabled={isLoadingSuppliers}
                />
              )}
            />
            <DatePicker
              label="PO Date *"
              {...register('poDate')}
              error={errors.poDate?.message}
            />
            <Select
              label="Incoterm *"
              options={INCOTERMS}
              {...register('incoterm')}
              error={errors.incoterm?.message}
            />
            <Input
              label="Country of Origin"
              {...register('countryOfOrigin')}
              error={errors.countryOfOrigin?.message}
            />
            <DatePicker
              label="Estimated Shipment Date"
              {...register('estimatedShipmentDate')}
              error={errors.estimatedShipmentDate?.message}
            />
            <DatePicker
              label="Estimated Arrival Date"
              {...register('estimatedArrivalDate')}
              error={errors.estimatedArrivalDate?.message}
            />
            <Input
              label="Currency"
              {...register('currency')}
              error={errors.currency?.message}
              readOnly
              className="bg-gray-50"
            />
            <div>
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
              {fxWarning && (
                <p className="mt-1 text-xs text-amber-600 font-medium">
                  {fxWarning}
                </p>
              )}
            </div>
            <Input
              label="Port of Loading"
              {...register('portOfLoading')}
              error={errors.portOfLoading?.message}
            />
            <Input
              label="Port of Destination"
              {...register('portOfDestination')}
              error={errors.portOfDestination?.message}
            />
          </div>
        )}

        {/* Step 2: Lines */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium text-gray-900">
                Purchase Order Lines
              </h4>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  append({
                    itemId: '',
                    quantity: 0,
                    unitOfMeasure: 'PCS',
                    unitPrice: 0,
                  })
                }
              >
                + Add Line Item
              </Button>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {fields.map((field, index) => {
                const lineTotal = new Decimal(
                  watch(`lines.${index}.quantity`) || 0,
                )
                  .mul(new Decimal(watch(`lines.${index}.unitPrice`) || 0))
                  .toFixed(2);
                return (
                  <div
                    key={field.id}
                    className="relative bg-gray-50 border border-gray-200 rounded-md p-4"
                  >
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                    >
                      ✕
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <Controller
                          name={`lines.${index}.itemId`}
                          control={control}
                          render={({ field: f }) => (
                            <ItemCombobox
                              value={f.value}
                              onChange={f.onChange}
                              onSelectFullItem={(item) => {
                                setValue(
                                  `lines.${index}.description`,
                                  item.description || '',
                                );
                                setValue(
                                  `lines.${index}.unitOfMeasure`,
                                  item.unitOfMeasure,
                                );
                                setValue(
                                  `lines.${index}.hsCode`,
                                  item.defaultHsCode || '',
                                );
                                const tariff = tariffs?.find(
                                  (t) => t.hsCode === item.defaultHsCode,
                                );
                                setValue(
                                  `lines.${index}.estimatedDutyRate`,
                                  tariff?.dutyStructure === 'ad_valorem'
                                    ? parseFloat(tariff.dutyRate)
                                    : 0,
                                );
                              }}
                              error={errors.lines?.[index]?.itemId?.message}
                            />
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="Description"
                          {...register(`lines.${index}.description`)}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Input
                          label="HS Code"
                          {...register(`lines.${index}.hsCode`)}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Input
                          label="Duty Rate (%)"
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.estimatedDutyRate`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="Quantity *"
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                          error={errors.lines?.[index]?.quantity?.message}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Input
                          label="UOM *"
                          {...register(`lines.${index}.unitOfMeasure`)}
                          error={errors.lines?.[index]?.unitOfMeasure?.message}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label={`Unit Price (${watchCurrency}) *`}
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.unitPrice`, {
                            valueAsNumber: true,
                          })}
                          error={errors.lines?.[index]?.unitPrice?.message}
                        />
                      </div>
                      <div className="md:col-span-1 flex flex-col justify-end pb-2 text-right">
                        <span className="text-xs text-gray-500 uppercase">
                          Line Total
                        </span>
                        <span className="font-mono font-medium text-lg text-gray-900">
                          {lineTotal}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Costs */}
        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">
                Estimated Logistics Costs (ETB)
              </h4>
              <Input
                label="Estimated Freight (ETB)"
                type="number"
                step="0.01"
                {...register('estimatedFreightEtb', { valueAsNumber: true })}
              />
              <Input
                label="Estimated Insurance (ETB)"
                type="number"
                step="0.01"
                {...register('estimatedInsuranceEtb', { valueAsNumber: true })}
              />
              <Input
                label="Other Charges (ETB)"
                type="number"
                step="0.01"
                {...register('estimatedOtherChargesEtb', {
                  valueAsNumber: true,
                })}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Final Financial Summary
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Review the total projected cost boundaries for this Purchase
                Order.
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  Total Purchase Value (FOB)
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <DualAmount
                    amountForeign={totalFobFcx.toFixed(2)}
                    amountEtb={totalFobEtb.toFixed(2)}
                    currency={watchCurrency}
                  />
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  Total Landed Estimate (CIF)
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <DualAmount
                    amountForeign={totalFobFcx.toFixed(2)}
                    amountEtb={totalCifEtb.toFixed(2)}
                    currency={watchCurrency}
                  />
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  Projected Customs Duty
                </dt>
                <dd className="mt-1 text-xl font-bold font-mono text-red-600">
                  {totalDutyPreview.toFixed(2)} ETB
                </dd>
              </div>
            </dl>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h4 className="text-blue-800 font-medium text-sm">
                  Approval Routing
                </h4>
                <p className="text-blue-600 text-xs mt-1">
                  Based on the equivalent USD value of{' '}
                  <span className="font-mono">${usdEquivalent.toFixed(2)}</span>
                  , this PO will route to:
                </p>
              </div>
              <div className="px-4 py-2 bg-white rounded-md shadow-sm border border-blue-100 font-semibold text-blue-900 text-sm">
                {requiredRole}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mt-8 pt-5 border-t border-gray-200 flex justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
            >
              &larr; Previous
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}

          {step < 4 ? (
            <Button type="button" variant="primary" onClick={onNext}>
              Next Step &rarr;
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSubmit((d) => onFinalSubmit(d, 'draft'))}
                isLoading={isSubmitting || submitMutation.isPending}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit((d) => setConfirmSubmit(d))}
                isLoading={isSubmitting || submitMutation.isPending}
              >
                Submit for Approval
              </Button>
            </div>
          )}
        </div>
      </form>

      {confirmSubmit && (
        <ConfirmDialog
          isOpen={true}
          title="Submit Purchase Order"
          message="Are you sure you want to route this Purchase Order to the ? You will no longer be able to edit the items once submitted."
          confirmText="Submit for Approval"
          isLoading={isSubmitting}
          onConfirm={() => onFinalSubmit(confirmSubmit, 'submit')}
          onClose={() => setConfirmSubmit(null)}
        />
      )}
    </Modal>
  );
}
