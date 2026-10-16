import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Combobox, Badge } from '@/components/ui';
import {
  usePurchaseOrders,
  usePurchaseOrder,
} from '@/features/purchase-orders/api';
import { useLettersOfCredit } from '@/features/letters-of-credit/api';
import { useCreateShipment } from '../api';

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
      shippedQuantity: z.number().min(0).optional().or(z.literal(NaN)),
      ciUnitPrice: z.number().min(0).optional().or(z.literal(NaN)),
      weightKg: z.number().min(0).optional().or(z.literal(NaN)),
      volumeCbm: z.number().min(0).optional().or(z.literal(NaN)),
    }),
  ),
});

type FullFormData = z.infer<typeof fullSchema>;

export function ShipmentCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const { data: poListData } = usePurchaseOrders({ status: 'approved' });
  const { data: lcData } = useLettersOfCredit();
  const createShipment = useCreateShipment();

  const pos = poListData?.data || [];
  const lcs = lcData?.data || [];

  const poOptions = pos.map((po) => ({
    value: po.id,
    label: `${po.poNumber} (${po.currency} ${po.totalAmount})`,
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
        alert('You must allocate shipped quantities to at least one PO line.');
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
    }
  };

  const watchedItems = form.watch('items');

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Register New Shipment
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Step {step} of 3:{' '}
            {step === 1
              ? 'Manifest Header'
              : step === 2
                ? 'Line Items Allocation'
                : 'Review'}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className={step === 1 ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Sourcing Links */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                  Primary Sourcing
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
                      placeholder="Search Approved POs..."
                    />
                  )}
                />

                {selectedPoListObj && (
                  <div className="bg-blue-50 p-4 rounded border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-1">
                        Auto-Linked Instrument
                      </p>
                      {linkedLc ? (
                        <p className="text-sm font-medium text-blue-900">
                          LC: {linkedLc.lcNumber}
                        </p>
                      ) : (
                        <p className="text-sm text-blue-800">
                          No LC Required (Open Account / Cash)
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
                  Transit & Carrier
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Vessel/Flight Name"
                    {...form.register('vesselName')}
                    error={form.formState.errors.vesselName?.message}
                  />
                  <Input
                    label="Carrier/Airline"
                    {...form.register('carrier')}
                    error={form.formState.errors.carrier?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Bill of Lading (B/L) No."
                    {...form.register('blNumber')}
                    error={form.formState.errors.blNumber?.message}
                  />
                  <Input
                    label="B/L Date"
                    type="date"
                    {...form.register('blDate')}
                    error={form.formState.errors.blDate?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Port of Loading"
                    {...form.register('portOfLoading')}
                    error={form.formState.errors.portOfLoading?.message}
                  />
                  <Input
                    label="Port of Destination"
                    {...form.register('portOfDestination')}
                    error={form.formState.errors.portOfDestination?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Incoterm"
                    options={[
                      { label: 'Select Incoterm', value: '' },
                      ...INCOTERMS,
                    ]}
                    {...form.register('incoterm')}
                  />
                  <Input
                    label="Estimated Time of Arrival (ETA)"
                    type="date"
                    {...form.register('eta')}
                    error={form.formState.errors.eta?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Total Weight (KG)"
                    type="number"
                    step="0.01"
                    {...form.register('totalWeightKg', { valueAsNumber: true })}
                    error={form.formState.errors.totalWeightKg?.message}
                  />
                  <Input
                    label="Total Volume (CBM)"
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
                    Container Numbers
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add container..."
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
                      Add
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
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-8">
              <Link to="/shipments">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="button" onClick={onNextStep} variant="primary">
                Next: Allocate Items
              </Button>
            </div>
          </div>

          <div className={step === 2 ? 'block' : 'hidden'}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Line Items Allocation
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
                  Allow Over-Shipment (Tolerance Exception)
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
                      Item Details
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Outstanding
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40"
                    >
                      Shipped Qty
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40"
                    >
                      CI Unit Price
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Weight (KG)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Volume (CBM)
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
                            Code: {poLine.item?.itemCode} | PO Unit Price:{' '}
                            {poLine.unitPrice}
                          </div>
                          {isOverShipment && (
                            <div className="text-xs font-bold text-red-600 mt-1">
                              OVER-SHIPMENT DETECTED
                            </div>
                          )}
                          {isShortfall && !isOverShipment && (
                            <div className="text-xs font-bold text-amber-600 mt-1">
                              SHORTFALL DETECTED
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
                        No lines found for this Purchase Order. Please go back
                        and select a valid PO.
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
                Back to Header
              </Button>
              <Button type="button" variant="primary" onClick={onReviewStep}>
                Next: Review & Submit
              </Button>
            </div>
          </div>
          {/* Step 3: Review */}
          <div className={step === 3 ? 'block' : 'hidden'}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Step 3: Review Shipment Payload
              </h3>
            </div>
            <div className="bg-gray-50 border rounded-lg p-6 space-y-4">
              <p className="text-sm text-gray-700">
                You are about to register a new maritime or air freight shipment
                manifest.
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>
                  <strong>PO:</strong> {selectedPoListObj?.poNumber}
                </li>
                <li>
                  <strong>B/L No:</strong> {form.watch('blNumber') || 'N/A'}
                </li>
                <li>
                  <strong>Vessel:</strong> {form.watch('vesselName') || 'N/A'}
                </li>
                <li>
                  <strong>Carrier:</strong> {form.watch('carrier') || 'N/A'}
                </li>
                <li>
                  <strong>Total Containers:</strong>{' '}
                  {form.watch('containerNumbers')?.length}
                </li>
                <li>
                  <strong>Items Packed:</strong>{' '}
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
                Back to Items
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createShipment.isPending}
              >
                Submit Shipment
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
