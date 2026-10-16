import React, { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Badge,
  PermissionGate,
  Skeleton,
} from '@/components/ui';
import {
  useCreateCommercialInvoice,
  useAcknowledgeVariance,
} from '../api';
import type { Shipment } from '../api';
import { usePurchaseOrder } from '@/features/purchase-orders/api';

const ciSchema = z.object({
  invoiceNumber: z.string().min(1, 'Required'),
  invoiceDate: z.string().min(1, 'Required'),
  currency: z.string().min(3).max(3),
  fxRate: z.number().positive(),
  items: z.array(
    z.object({
      shipmentItemId: z.string(),
      poLineId: z.string(), // for UI reference only
      ciUnitPrice: z.number().min(0),
    }),
  ),
});

type CIFormData = z.infer<typeof ciSchema>;

export function CommercialInvoiceTab({ shipment }: { shipment: Shipment }) {
  const createCi = useCreateCommercialInvoice();
  const ackVariance = useAcknowledgeVariance();

  const { data: poData, isLoading: poLoading } = usePurchaseOrder(
    shipment.poId,
  );
  const po = poData;

  // Find existing CI (backend currently supports many, but usually it's one per shipment)
  const existingCi =
    shipment.commercialInvoices?.[0] ?? shipment.commercialInvoice;

  const defaultItems = useMemo(() => {
    return (
      shipment.items?.map((item) => ({
        shipmentItemId: item.id,
        poLineId: item.poLineId,
        ciUnitPrice: parseFloat(String(item.ciUnitPrice)) || 0,
      })) || []
    );
  }, [shipment.items]);

  const form = useForm<CIFormData>({
    resolver: zodResolver(ciSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      currency: po?.currency || 'USD',
      fxRate: parseFloat(po?.fxRate || '1'),
      items: defaultItems,
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');

  const onSubmit = async (data: CIFormData) => {
    try {
      await createCi.mutateAsync({
        shipmentId: shipment.id,
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          currency: data.currency,
          fxRate: data.fxRate,
          items: data.items.map((i) => ({
            shipmentItemId: i.shipmentItemId,
            ciUnitPrice: i.ciUnitPrice,
          })),
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcknowledge = async () => {
    if (!existingCi) return;
    try {
      await ackVariance.mutateAsync({ ciId: existingCi.id });
    } catch (e) {
      console.error(e);
    }
  };

  if (poLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      {existingCi && !existingCi.acknowledgedAt && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex justify-between items-center shadow-sm">
          <div>
            <h3 className="text-red-800 font-bold text-sm uppercase tracking-wide">
              Price Variance Alert (BR11)
            </h3>
            <p className="text-red-700 text-sm mt-1">
              This invoice exceeds the PO total by{' '}
              <strong>
                {parseFloat(existingCi.priceVariancePct || '0').toFixed(2)}%
              </strong>
              , crossing the policy threshold.
            </p>
          </div>
          <PermissionGate permission="po:approve:tier1">
            <Button
              onClick={handleAcknowledge}
              isLoading={ackVariance.isPending}
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
            >
              Acknowledge Variance
            </Button>
          </PermissionGate>
        </div>
      )}

      {existingCi &&
        existingCi.acknowledgedAt &&
        parseFloat(existingCi.priceVariancePct || '0') > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
            <h3 className="text-amber-800 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
              Variance Acknowledged
              <svg
                className="w-4 h-4 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </h3>
            <p className="text-amber-700 text-sm mt-1">
              Variance of{' '}
              {parseFloat(existingCi.priceVariancePct || '0').toFixed(2)}% was
              acknowledged by management.
            </p>
          </div>
        )}

      {existingCi ? (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-5 sm:px-6 border-b bg-gray-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Commercial Invoice Details
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Invoice {existingCi.invoiceNumber ?? existingCi.ciNumber} recorded on{' '}
                {new Date(existingCi.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="success">Posted</Badge>
          </div>
          <div className="px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Invoice Number
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">
                  {existingCi.invoiceNumber ?? existingCi.ciNumber}
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Invoice Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {existingCi.invoiceDate ?? existingCi.ciDate}
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Total Amounts
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="font-bold">
                    {existingCi.currency ?? po?.currency}{' '}
                    {parseFloat(
                      existingCi.totalForeign ?? existingCi.totalAmountForeign,
                    ).toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    (@ {parseFloat(existingCi.fxRate ?? po?.fxRate ?? '1')} = ETB{' '}
                    {parseFloat(existingCi.totalEtb ?? '0').toLocaleString()})
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="bg-white shadow-sm border rounded-lg p-6 space-y-6"
        >
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
            Record Commercial Invoice
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Invoice Number"
              {...form.register('invoiceNumber')}
              error={form.formState.errors.invoiceNumber?.message}
            />
            <Input
              label="Invoice Date"
              type="date"
              {...form.register('invoiceDate')}
              error={form.formState.errors.invoiceDate?.message}
            />
            <Input
              label="Currency"
              {...form.register('currency')}
              error={form.formState.errors.currency?.message}
            />
            <Input
              label="FX Rate (to ETB)"
              type="number"
              step="0.0001"
              {...form.register('fxRate', { valueAsNumber: true })}
              error={form.formState.errors.fxRate?.message}
            />
          </div>

          <div className="overflow-x-auto border rounded mt-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Item
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    PO Unit Price
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-48"
                  >
                    CI Unit Price
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32"
                  >
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fields.map((field, index) => {
                  const poLine = po?.poLines?.find(
                    (l) => l.id === field.poLineId,
                  );
                  const poPrice = parseFloat(poLine?.unitPrice || '0');
                  const ciPrice = watchedItems?.[index]?.ciUnitPrice || 0;

                  let variancePct = 0;
                  if (poPrice > 0) {
                    variancePct = ((ciPrice - poPrice) / poPrice) * 100;
                  }

                  const isHighVariance = variancePct > 10;

                  return (
                    <tr key={field.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {poLine?.item?.name || 'Unknown Item'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {po?.currency} {poPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register(`items.${index}.ciUnitPrice`, {
                            valueAsNumber: true,
                          })}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span
                          className={`text-sm font-bold ${variancePct === 0 ? 'text-gray-400' : isHighVariance ? 'text-red-600' : variancePct > 0 ? 'text-amber-500' : 'text-green-600'}`}
                        >
                          {variancePct > 0 ? '+' : ''}
                          {variancePct.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <PermissionGate permission="shipment:write">
              <Button
                type="submit"
                variant="primary"
                isLoading={createCi.isPending}
              >
                Post Commercial Invoice
              </Button>
            </PermissionGate>
          </div>
        </form>
      )}
    </div>
  );
}
