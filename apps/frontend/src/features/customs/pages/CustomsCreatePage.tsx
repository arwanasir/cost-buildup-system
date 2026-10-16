import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateDeclaration, type CreateDeclarationDto } from '../api';
import { useShipments } from '@/features/import-shipments/api';
import { Button, Input, PermissionGate } from '@/components/ui';

const createDeclarationSchema = z.object({
  shipmentId: z.string().uuid('Please select a valid shipment'),
  declarationNumber: z.string().min(1, 'Declaration number is required'),
  declarationDate: z.string().min(1, 'Declaration date is required'),
  clearingAgent: z.string().optional(),
  fxRate: z.number().positive('FX Rate must be positive'),
});

type FormData = z.infer<typeof createDeclarationSchema>;

export function CustomsCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateDeclaration();

  // Fetch only shipments that are either shipped or at_customs
  const { data: shipmentsData, isLoading: loadingShipments } = useShipments({
    status: 'shipped,at_customs',
  });
  const shipments = shipmentsData?.data || [];

  const form = useForm<FormData>({
    resolver: zodResolver(createDeclarationSchema),
    defaultValues: {
      shipmentId: '',
      declarationNumber: '',
      declarationDate: new Date().toISOString().split('T')[0],
      clearingAgent: '',
      fxRate: 1,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload: CreateDeclarationDto = {
        shipmentId: data.shipmentId,
        declarationNumber: data.declarationNumber,
        declarationDate: data.declarationDate,
        clearingAgent: data.clearingAgent,
        fxRate: data.fxRate,
      };

      const result = await createMutation.mutateAsync(payload);
      // Navigate to the newly created declaration's detail page
      navigate(`/customs/${result.id}`);
    } catch (err) {
      console.error('Failed to create declaration:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Create Customs Declaration
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Register a new customs declaration for a shipment that has arrived at
          customs.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Shipment Selection */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Shipment
              </label>
              <select
                {...form.register('shipmentId')}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  form.formState.errors.shipmentId
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                disabled={loadingShipments}
              >
                <option value="">-- Select a Shipment --</option>
                {shipments.map((shipment) => (
                  <option key={shipment.id} value={shipment.id}>
                    {shipment.blNumber ? `B/L: ${shipment.blNumber} ` : ''}(ID:{' '}
                    {shipment.id.substring(0, 8)}) - Status:{' '}
                    {shipment.status.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
              {form.formState.errors.shipmentId && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.shipmentId.message}
                </p>
              )}
            </div>

            <Input
              label="Declaration Number"
              placeholder="e.g. DEC-2026-001"
              {...form.register('declarationNumber')}
              error={form.formState.errors.declarationNumber?.message}
            />

            <Input
              label="Declaration Date"
              type="date"
              {...form.register('declarationDate')}
              error={form.formState.errors.declarationDate?.message}
            />

            <Input
              label="Clearing Agent (Optional)"
              placeholder="Agent Name"
              {...form.register('clearingAgent')}
              error={form.formState.errors.clearingAgent?.message}
            />

            <Input
              label="FX Rate (to ETB)"
              type="number"
              step="0.000001"
              {...form.register('fxRate', { valueAsNumber: true })}
              error={form.formState.errors.fxRate?.message}
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate('/customs')}>
              Cancel
            </Button>
            <PermissionGate permission="customs:write">
              <Button
                type="submit"
                variant="primary"
                isLoading={createMutation.isPending}
              >
                Create Declaration
              </Button>
            </PermissionGate>
          </div>
        </form>
      </div>
    </div>
  );
}
