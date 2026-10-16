import React, { useState } from 'react';
import {
  useExchangeRates,
  useCreateExchangeRate,
  type ExchangeRate,
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
  Select,
  DatePicker,
  FxInput,
  Skeleton,
  ErrorState,
  FormError,
} from '@/components/ui';

const CURRENCIES = [
  { label: 'USD (US Dollar)', value: 'USD' },
  { label: 'EUR (Euro)', value: 'EUR' },
  { label: 'GBP (British Pound)', value: 'GBP' },
  { label: 'AED (Emirati Dirham)', value: 'AED' },
  { label: 'CNY (Chinese Yuan)', value: 'CNY' },
];

const rateSchema = z.object({
  currency: z.string().min(1, 'Currency is required'),
  rateDate: z.string().min(1, 'Date is required'),
  rate: z.number().positive('Rate must be positive'),
});

type RateFormData = z.infer<typeof rateSchema>;

export function NbeRatesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: rates, isLoading, isError, refetch } = useExchangeRates();
  const createMutation = useCreateExchangeRate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RateFormData>({
    resolver: zodResolver(rateSchema),
  });

  const selectedCurrency = watch('currency') || 'USD';

  const openCreate = () => {
    reset({
      currency: 'USD',
      rateDate: new Date().toISOString().split('T')[0],
      rate: undefined,
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: RateFormData) => {
    createMutation.mutate(data, { onSuccess: () => setIsFormOpen(false) });
  };

  const columns = [
    {
      header: 'Date',
      accessor: (row: ExchangeRate) =>
        format(new Date(row.rateDate), 'yyyy-MM-dd'),
    },
    {
      header: 'Currency',
      accessor: 'currency' as keyof ExchangeRate,
      sortable: true,
    },
    {
      header: 'Rate (ETB)',
      accessor: (row: ExchangeRate) => parseFloat(row.rate).toFixed(6),
    },
    {
      header: 'Entered On',
      accessor: (row: ExchangeRate) =>
        format(new Date(row.createdAt), 'MMM d, yyyy HH:mm'),
    },
  ];

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (isError)
    return (
      <ErrorState
        message="Failed to load exchange rates"
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            NBE Exchange Rates
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Record daily National Bank of Ethiopia exchange rates. History is
            immutable for audit purposes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={openCreate}>Record Daily Rate</Button>
        </div>
      </div>

      <Table columns={columns} data={rates || []} />

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Record NBE Exchange Rate"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormError error={createMutation.error} />
          <Select
            label="Currency"
            options={CURRENCIES}
            {...register('currency')}
            error={errors.currency?.message}
          />
          <DatePicker
            label="Rate Date"
            {...register('rateDate')}
            error={errors.rateDate?.message}
          />
          <FxInput
            label="Rate against ETB"
            currency={selectedCurrency}
            {...register('rate', { valueAsNumber: true })}
            error={errors.rate?.message}
          />

          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              className="w-full sm:ml-3 sm:w-auto"
            >
              Apply
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
