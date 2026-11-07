import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Combobox, Badge } from '@/components/ui';
import {
  usePurchaseOrders,
  usePurchaseOrder,
  type PurchaseOrder,
} from '@/features/purchase-orders/api';
import { useLettersOfCredit } from '@/features/letters-of-credit/api';
import { useCreateShipment } from '../api';

export function getShipmentEligiblePurchaseOrders(
  approved: PurchaseOrder[],
  lcApplied: PurchaseOrder[],
) {
  const uniqueOrders = new Map<string, PurchaseOrder>();
  [...approved, ...lcApplied].forEach((po) => uniqueOrders.set(po.id, po));
  return [...uniqueOrders.values()];
}

const INCOTERMS = [
  'EXW',
  'FCA',
  'FAS',
  'FOB',
  'CFR',
  'CIF',
  'CPT',
  'CIP',
  'DAP',
  'DPU',
  'DDP',
].map((val) => ({ label: val, value: val }));

const fullSchema = z.object({
  poId: z.string().min(1, 'Purchase Order is required'),
  vesselName: z.string().optional(),
  blNumber: z.string().optional(),
  blDate: z.string().optional(),
  portOfLoading: z.string().optional(),
  portOfDestination: z.string().optional(),
  incoterm: z.string().optional(),
  carrier: z.string().optional(),
  containerNumbers: z.array(z.string()).optional(),
  eta: z.string().optional(),
  totalWeightKg: z
    .number()
    .positive('Must be positive')
    .optional()
    .or(z.literal(NaN)),
  totalVolumeCbm: z
    .number()
    .positive('Must be positive')
    .optional()
    .or(z.literal(NaN)),
  allowOverShipment: z.boolean().optional(),
  items: z.array(
    z.object({
      poLineId: z.string(),
      shippedQuantity: z
        .number()
        .positive('Must be positive')
        .optional()
        .or(z.literal(NaN)),
      ciUnitPrice: z.number().positive('Must be positive'),
      weightKg: z
        .number()
        .positive('Must be positive')
        .optional()
        .or(z.literal(NaN)),
      volumeCbm: z
        .number()
        .positive('Must be positive')
        .optional()
        .or(z.literal(NaN)),
    }),
  ),
});

type FullFormData = z.infer<typeof fullSchema>;

export function ShipmentCreatePage() {
  const localize = useUiText();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitError, setSubmitError] = useState('');

  const { data: approvedPoData } = usePurchaseOrders({
    status: 'approved',
    limit: 1000,
  });
  const { data: lcAppliedPoData } = usePurchaseOrders({
    status: 'lc_applied',
    limit: 1000,
  });
  const { data: lcData } = useLettersOfCredit();
  const createShipment = useCreateShipment();

  const pos = getShipmentEligiblePurchaseOrders(
    approvedPoData?.data || [],
    lcAppliedPoData?.data || [],
  );
  const lcs = lcData?.data || [];

  const poOptions = pos.map((po) => ({
    value: po.id,
    label: `${po.poNumber} (${localize(po.status === 'lc_applied' ? 'LC Applied' : 'Approved')}; ${po.currency} ${po.totalAmount})`,
  }));

  const form = useForm<FullFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      containerNumbers: [],
      items: [],
      allowOverShipment: false,
    },
    mode: 'onChange',
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const selectedPoId = form.watch('poId');
  const allowOverShipment = form.watch('allowOverShipment');
  const selectedPoListObj = pos.find((po) => po.id === selectedPoId);
  const linkedLc = selectedPoListObj?.lcId
    ? lcs.find((lc) => lc.id === selectedPoListObj.lcId)
    : null;

  const { data: poDetailData } = usePurchaseOrder(selectedPoId);
  const poDetail = poDetailData;

  // Initialize line items when PO is fully loaded
  useEffect(() => {
    if (poDetail && poDetail.poLines && step === 1) {
      const items = (poDetail.poLines as any[]).map((line) => ({
        poLineId: line.id,
        shippedQuantity: NaN, // Empty by default
        ciUnitPrice: parseFloat(line.unitPrice) || NaN,
        weightKg: NaN,
        volumeCbm: NaN,
      }));
      replace(items);
    }
  }, [poDetail, replace, step]);

  const [containerInput, setContainerInput] = useState('');

  const addContainer = () => {
    const trimmed = containerInput.trim();
    if (!trimmed) return;
    const current = form.getValues('containerNumbers') || [];
    if (!current.includes(trimmed)) {
      form.setValue('containerNumbers', [...current, trimmed]);
    }
    setContainerInput('');
  };

  const removeContainer = (tag: string) => {
    const current = form.getValues('containerNumbers') || [];
    form.setValue(
      'containerNumbers',
      current.filter((c) => c !== tag),
    );
  };

  const onNextStep = async () => {
    const valid = await form.trigger([
      'poId',
      'vesselName',
      'blNumber',
      'blDate',
      'portOfLoading',
      'portOfDestination',
      'incoterm',
      'carrier',
      'eta',
      'totalWeightKg',
      'totalVolumeCbm',
    ]);
    if (valid) {
      setStep(2);
    }
  };

  const onReviewStep = async () => {
    const valid = await form.trigger('items');
    if (valid) {
      setStep(3);
    }
  };

  const onSubmit = async (data: FullFormData) => {
    setSubmitError('');
    try {
      // Filter out items that have no shipped quantity or zero
      const validItems = data.items
        .filter(
          (i) =>
            i.shippedQuantity &&
            !isNaN(i.shippedQuantity) &&
            i.shippedQuantity > 0,
        )
        .map((i) => ({
          poLineId: i.poLineId,
          shippedQuantity: i.shippedQuantity!,
          ciUnitPrice: i.ciUnitPrice || 0,
          weightKg: isNaN(i.weightKg as number) ? undefined : i.weightKg,
          volumeCbm: isNaN(i.volumeCbm as number) ? undefined : i.volumeCbm,
        }));

      if (validItems.length === 0) {
        setStep(2);
        setSubmitError(
          localize(
            'Enter a positive shipped quantity for at least one PO line.',
          ),
        );
        return;
      }

      const payload = {
        ...data,
        items: validItems,
        totalWeightKg: isNaN(data.totalWeightKg as number)
          ? undefined
          : data.totalWeightKg,
        totalVolumeCbm: isNaN(data.totalVolumeCbm as number)
          ? undefined
          : data.totalVolumeCbm,
      };

      const res = await createShipment.mutateAsync(payload as any);
      navigate(`/shipments/${res.data.id}`);
    } catch (e) {
      console.error(e);
      const responseMessage = (
        e as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(' ')
        : responseMessage;
      setSubmitError(
        message ||
          localize('Shipment could not be submitted. Please try again.'),
      );
    }
  };

  const onInvalid = (errors: typeof form.formState.errors) => {
    setSubmitError(
      localize('Review the highlighted fields before submitting the shipment.'),
    );
    setStep(errors.items ? 2 : 1);
  };

  const watchedItems = form.watch('items');

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            <LocalizedText
              text={'\n            Register New Shipment\n          '}
            />
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            <LocalizedText text={'\n            Step '} />
            {step} <LocalizedText text={' of 3:'} />
            <LocalizedText text={' '} />
            <LocalizedText
              text={
                step === 1
                  ? 'Manifest Header'
                  : step === 2
                    ? 'Line Items Allocation'
                    : 'Review'
              }
            />
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
        <form
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          className="space-y-8"
        >
          {submitError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {submitError}
            </div>
          )}
          <div className={step === 1 ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Sourcing Links */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                  <LocalizedText
                    text={
                      '\n                  Primary Sourcing\n                '
                    }
                  />
                </h3>

                <Controller
                  name="poId"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox
                      label="Purchase Order *"
                      options={poOptions}
                      value={field.value}
                      onChange={field.onChange}
                      error={form.formState.errors.poId?.message}
                      placeholder={localize('Search shipment-eligible POs...')}
                    />
                  )}
                />

                {selectedPoListObj && (
                  <div className="bg-blue-50 p-4 rounded border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-1">
                        <LocalizedText
                          text={
                            '\n                        Auto-Linked Instrument\n                      '
                          }
                        />
                      </p>
                      {linkedLc ? (
                        <p className="text-sm font-medium text-blue-900">
                          <LocalizedText
                            text={'\n                          LC: '}
                          />
                          {linkedLc.lcNumber}
                        </p>
                      ) : (
                        <p className="text-sm text-blue-800">
                          <LocalizedText
                            text={
                              '\n                          No LC Required (Open Account / Cash)\n                        '
                            }
                          />
                        </p>
                      )}
                    </div>
                    {linkedLc && (
                      <Badge variant="info">{linkedLc.lcType}</Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Transport Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                  <LocalizedText
                    text={
                      '\n                  Transit & Carrier\n                '
                    }
                  />
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={localize('Vessel/Flight Name')}
                    {...form.register('vesselName')}
                    error={form.formState.errors.vesselName?.message}
                  />
                  <Input
                    label={localize('Carrier/Airline')}
                    {...form.register('carrier')}
                    error={form.formState.errors.carrier?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={localize('Bill of Lading (B/L) No.')}
                    {...form.register('blNumber')}
                    error={form.formState.errors.blNumber?.message}
                  />
                  <Input
                    label={localize('B/L Date')}
                    type="date"
                    {...form.register('blDate')}
                    error={form.formState.errors.blDate?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={localize('Port of Loading')}
                    {...form.register('portOfLoading')}
                    error={form.formState.errors.portOfLoading?.message}
                  />
                  <Input
                    label={localize('Port of Destination')}
                    {...form.register('portOfDestination')}
                    error={form.formState.errors.portOfDestination?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label={localize('Incoterm')}
                    options={[
                      { label: 'Select Incoterm', value: '' },
                      ...INCOTERMS,
                    ]}
                    {...form.register('incoterm')}
                  />
                  <Input
                    label={localize('Estimated Time of Arrival (ETA)')}
                    type="date"
                    {...form.register('eta')}
                    error={form.formState.errors.eta?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={localize('Total Weight (KG)')}
                    type="number"
                    step="0.01"
                    {...form.register('totalWeightKg', { valueAsNumber: true })}
                    error={form.formState.errors.totalWeightKg?.message}
                  />
                  <Input
                    label={localize('Total Volume (CBM)')}
                    type="number"
                    step="0.01"
                    {...form.register('totalVolumeCbm', {
                      valueAsNumber: true,
                    })}
                    error={form.formState.errors.totalVolumeCbm?.message}
                  />
                </div>

                {/* Container Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <LocalizedText
                      text={
                        '\n                    Container Numbers\n                  '
                      }
                    />
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={localize('Add container...')}
                      value={containerInput}
                      onChange={(e) => setContainerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addContainer();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={addContainer}
                      variant="secondary"
                    >
                      <LocalizedText
                        text={
                          '\n                      Add\n                    '
                        }
                      />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.watch('containerNumbers')?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeContainer(tag)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <LocalizedText
                            text={
                              '\n                          &times;\n                        '
                            }
                          />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-8">
              <Link to="/shipments">
                <Button variant="secondary">
                  <LocalizedText text={'Cancel'} />
                </Button>
              </Link>
              <Button type="button" onClick={onNextStep} variant="primary">
                <LocalizedText
                  text={
                    '\n                Next: Allocate Items\n              '
                  }
                />
              </Button>
            </div>
          </div>

          <div className={step === 2 ? 'block' : 'hidden'}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                <LocalizedText
                  text={
                    '\n                Line Items Allocation\n              '
                  }
                />
              </h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowOverShipment"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  {...form.register('allowOverShipment')}
                />
                <label
                  htmlFor="allowOverShipment"
                  className="ml-2 block text-sm text-gray-900"
                >
                  <LocalizedText
                    text={
                      '\n                  Allow Over-Shipment (Tolerance Exception)\n                '
                    }
                  />
                </label>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <LocalizedText
                        text={
                          '\n                      Item Details\n                    '
                        }
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      <LocalizedText
                        text={
                          '\n                      Outstanding\n                    '
                        }
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40"
                    >
                      <LocalizedText
                        text={
                          '\n                      Shipped Qty\n                    '
                        }
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40"
                    >
                      <LocalizedText
                        text={
                          '\n                      CI Unit Price\n                    '
                        }
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      <LocalizedText
                        text={
                          '\n                      Weight (KG)\n                    '
                        }
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      <LocalizedText
                        text={
                          '\n                      Volume (CBM)\n                    '
                        }
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fields.map((field, index) => {
                    const poLine = (poDetail?.poLines as any[])?.find(
                      (l: any) => l.id === field.poLineId,
                    );
                    if (!poLine) return null;

                    const ordered = parseFloat(poLine.quantity || '0');
                    const previouslyShipped = parseFloat(
                      poLine.shippedQuantity || '0',
                    );
                    const outstanding = Math.max(
                      0,
                      ordered - previouslyShipped,
                    );

                    const currentShipped = parseFloat(
                      (watchedItems?.[index]?.shippedQuantity as any) || '0',
                    );
                    const isOverShipment = currentShipped > outstanding;
                    const isShortfall =
                      currentShipped > 0 && currentShipped < outstanding;

                    return (
                      <tr
                        key={field.id}
                        className={
                          isOverShipment && !allowOverShipment
                            ? 'bg-red-50'
                            : ''
                        }
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {poLine.item?.name || 'Unknown Item'}
                          </div>
                          <div className="text-xs text-gray-500">
                            <LocalizedText
                              text={'\n                            Code: '}
                            />
                            {poLine.item?.itemCode}{' '}
                            <LocalizedText text={' | PO Unit Price:'} />
                            <LocalizedText text={' '} />
                            {poLine.unitPrice}
                          </div>
                          {isOverShipment && (
                            <div className="text-xs font-bold text-red-600 mt-1">
                              <LocalizedText
                                text={
                                  '\n                              OVER-SHIPMENT DETECTED\n                            '
                                }
                              />
                            </div>
                          )}
                          {isShortfall && !isOverShipment && (
                            <div className="text-xs font-bold text-amber-600 mt-1">
                              <LocalizedText
                                text={
                                  '\n                              SHORTFALL DETECTED\n                            '
                                }
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {outstanding.toLocaleString()} {poLine.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(
                              `items.${index}.shippedQuantity`,
                              {
                                valueAsNumber: true,
                                validate: (val) => {
                                  if (
                                    val &&
                                    val > outstanding &&
                                    !form.getValues('allowOverShipment')
                                  ) {
                                    return `Max allowed: ${outstanding}`;
                                  }
                                  return true;
                                },
                              },
                            )}
                            error={
                              form.formState.errors.items?.[index]
                                ?.shippedQuantity?.message
                            }
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.ciUnitPrice`, {
                              valueAsNumber: true,
                            })}
                            error={
                              form.formState.errors.items?.[index]?.ciUnitPrice
                                ?.message
                            }
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.weightKg`, {
                              valueAsNumber: true,
                            })}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.volumeCbm`, {
                              valueAsNumber: true,
                            })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {fields.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        <LocalizedText
                          text={
                            '\n                        No lines found for this Purchase Order. Please go back\n                        and select a valid PO.\n                      '
                          }
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-8">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
              >
                <LocalizedText
                  text={'\n                Back to Header\n              '}
                />
              </Button>
              <Button type="button" variant="primary" onClick={onReviewStep}>
                <LocalizedText
                  text={
                    '\n                Next: Review & Submit\n              '
                  }
                />
              </Button>
            </div>
          </div>
          {/* Step 3: Review */}
          <div className={step === 3 ? 'block' : 'hidden'}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                <LocalizedText
                  text={
                    '\n                Step 3: Review Shipment Payload\n              '
                  }
                />
              </h3>
            </div>
            <div className="bg-gray-50 border rounded-lg p-6 space-y-4">
              <p className="text-sm text-gray-700">
                <LocalizedText
                  text={
                    '\n                You are about to register a new maritime or air freight shipment\n                manifest.\n              '
                  }
                />
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>
                  <strong>
                    <LocalizedText text={'PO:'} />
                  </strong>{' '}
                  {selectedPoListObj?.poNumber}
                </li>
                <li>
                  <strong>
                    <LocalizedText text={'B/L No:'} />
                  </strong>{' '}
                  {form.watch('blNumber') || 'N/A'}
                </li>
                <li>
                  <strong>
                    <LocalizedText text={'Vessel:'} />
                  </strong>{' '}
                  {form.watch('vesselName') || 'N/A'}
                </li>
                <li>
                  <strong>
                    <LocalizedText text={'Carrier:'} />
                  </strong>{' '}
                  {form.watch('carrier') || 'N/A'}
                </li>
                <li>
                  <strong>
                    <LocalizedText text={'Total Containers:'} />
                  </strong>
                  <LocalizedText text={' '} />
                  {form.watch('containerNumbers')?.length}
                </li>
                <li>
                  <strong>
                    <LocalizedText text={'Items Packed:'} />
                  </strong>
                  <LocalizedText text={' '} />
                  {
                    form
                      .watch('items')
                      ?.filter(
                        (i) => i.shippedQuantity && i.shippedQuantity > 0,
                      ).length
                  }
                </li>
              </ul>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t mt-8">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(2)}
              >
                <LocalizedText
                  text={'\n                Back to Items\n              '}
                />
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createShipment.isPending}
                disabled={createShipment.isPending}
              >
                <LocalizedText
                  text={'\n                Submit Shipment\n              '}
                />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
