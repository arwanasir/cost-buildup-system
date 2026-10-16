import React, { useState } from 'react';
import {
  useTariffs,
  useCreateTariff,
  useUpdateTariff,
  type Tariff,
} from '../api';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Table,
  Button,
  Modal,
  Input,
  Select,
  DatePicker,
  Skeleton,
  ErrorState,
  Badge,
  FormError,
} from '@/components/ui';

const DUTY_STRUCTURES = [
  { label: 'Ad Valorem (Percentage based)', value: 'ad_valorem' },
  { label: 'Specific (Amount per unit)', value: 'specific' },
];

const tariffSchema = z
  .object({
    hsCode: z.string().min(1, 'HS Code is required'),
    description: z.string().min(1, 'Description is required'),
    dutyStructure: z.enum(['ad_valorem', 'specific']),
    dutyRate: z.number().min(0).max(100).optional().or(z.nan()),
    specificDutyPerUnit: z.number().min(0).optional().or(z.nan()),
    exciseRate: z.number().min(0).max(100).optional().or(z.nan()),
    withholdingRate: z.number().min(0).max(100).optional().or(z.nan()),
    effectiveFrom: z.string().min(1, 'Effective date is required'),
  })
  .refine(
    (data) => {
      if (
        data.dutyStructure === 'ad_valorem' &&
        (data.dutyRate === undefined || Number.isNaN(data.dutyRate))
      )
        return false;
      if (
        data.dutyStructure === 'specific' &&
        (data.specificDutyPerUnit === undefined ||
          Number.isNaN(data.specificDutyPerUnit))
      )
        return false;
      return true;
    },
    {
      message: 'Required rate missing for selected structure',
      path: ['dutyStructure'],
    },
  );

type TariffFormData = z.infer<typeof tariffSchema>;

export function TariffsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);

  const { data: tariffs, isLoading, isError, refetch } = useTariffs();
  const createMutation = useCreateTariff();
  const updateMutation = useUpdateTariff();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TariffFormData>({
    resolver: zodResolver(tariffSchema),
  });

  const selectedStructure = watch('dutyStructure');

  const openCreate = () => {
    setEditingTariff(null);
    reset({
      hsCode: '',
      description: '',
      dutyStructure: 'ad_valorem',
      dutyRate: 0,
      specificDutyPerUnit: 0,
      exciseRate: 0,
      withholdingRate: 0,
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const openEdit = (tariff: Tariff) => {
    setEditingTariff(tariff);
    reset({
      hsCode: tariff.hsCode,
      description: tariff.description,
      dutyStructure: tariff.dutyStructure,
      dutyRate: tariff.dutyRate ? parseFloat(tariff.dutyRate) : 0,
      specificDutyPerUnit: tariff.specificDutyPerUnit
        ? parseFloat(tariff.specificDutyPerUnit)
        : 0,
      exciseRate: tariff.exciseRate ? parseFloat(tariff.exciseRate) : 0,
      withholdingRate: tariff.withholdingRate
        ? parseFloat(tariff.withholdingRate)
        : 0,
      effectiveFrom: new Date(tariff.effectiveFrom).toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: TariffFormData) => {
    const payload = {
      ...data,
      dutyRate: data.dutyStructure === 'ad_valorem' ? data.dutyRate : null,
      specificDutyPerUnit:
        data.dutyStructure === 'specific' ? data.specificDutyPerUnit : null,
    };
    if (editingTariff) {
      updateMutation.mutate(
        { hsCode: editingTariff.hsCode, data: payload as any },
        { onSuccess: () => setIsFormOpen(false) },
      );
    } else {
      createMutation.mutate(payload as any, {
        onSuccess: () => setIsFormOpen(false),
      });
    }
  };

  const columns = [
    { header: 'HS Code', accessor: 'hsCode' as keyof Tariff, sortable: true },
    { header: 'Description', accessor: 'description' as keyof Tariff },
    {
      header: 'Duty Structure',
      accessor: (row: Tariff) => (
        <Badge variant="info">
          {row.dutyStructure === 'ad_valorem' ? 'Ad Valorem' : 'Specific'}
        </Badge>
      ),
    },
    {
      header: 'Duty Rate',
      accessor: (row: Tariff) =>
        row.dutyStructure === 'ad_valorem'
          ? `${row.dutyRate}%`
          : `${row.specificDutyPerUnit} ETB/unit`,
    },
    {
      header: 'Excise (%)',
      accessor: (row: Tariff) => (row.exciseRate ? `${row.exciseRate}%` : '-'),
    },
    {
      header: 'Withholding (%)',
      accessor: (row: Tariff) =>
        row.withholdingRate ? `${row.withholdingRate}%` : '-',
    },
    {
      header: 'Effective From',
      accessor: (row: Tariff) =>
        format(new Date(row.effectiveFrom), 'yyyy-MM-dd'),
    },
    {
      header: 'Actions',
      accessor: (row: Tariff) => (
        <button
          onClick={() => openEdit(row)}
          className="text-blue-600 hover:text-blue-900 font-medium text-sm"
        >
          Edit
        </button>
      ),
    },
  ];

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (isError)
    return (
      <ErrorState message="Failed to load tariffs" onRetry={() => refetch()} />
    );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Customs Tariffs Book
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage HS Codes, structure definitions, and statutory rates for
            landed cost calculation.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={openCreate}>Add HS Code</Button>
        </div>
      </div>

      <Table columns={columns} data={tariffs || []} />

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTariff ? 'Edit HS Code Tariff' : 'Add New HS Code'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormError error={createMutation.error || updateMutation.error} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="HS Code"
              {...register('hsCode')}
              error={errors.hsCode?.message}
              disabled={!!editingTariff} // Cannot edit HS code once created
            />
            <DatePicker
              label="Effective From"
              {...register('effectiveFrom')}
              error={errors.effectiveFrom?.message}
            />
          </div>

          <Input
            label="Description"
            {...register('description')}
            error={errors.description?.message}
          />

          <Select
            label="Duty Structure"
            options={DUTY_STRUCTURES}
            {...register('dutyStructure')}
            error={errors.dutyStructure?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            {selectedStructure === 'ad_valorem' ? (
              <Input
                label="Duty Rate (%)"
                type="number"
                step="0.01"
                {...register('dutyRate', { valueAsNumber: true })}
                error={errors.dutyRate?.message}
              />
            ) : (
              <Input
                label="Specific Duty (ETB/unit)"
                type="number"
                step="0.01"
                {...register('specificDutyPerUnit', { valueAsNumber: true })}
                error={errors.specificDutyPerUnit?.message}
              />
            )}

            <Input
              label="Excise Rate (%)"
              type="number"
              step="0.01"
              {...register('exciseRate', { valueAsNumber: true })}
              error={errors.exciseRate?.message}
            />
          </div>

          <Input
            label="Withholding Rate (%)"
            type="number"
            step="0.01"
            {...register('withholdingRate', { valueAsNumber: true })}
            error={errors.withholdingRate?.message}
          />

          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="w-full sm:ml-3 sm:w-auto"
            >
              {editingTariff ? 'Save Changes' : 'Create HS Code'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
