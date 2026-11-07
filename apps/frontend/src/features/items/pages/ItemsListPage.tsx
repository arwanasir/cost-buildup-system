import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeactivateItem,
  type Item,
} from '../api';
import {
  Table,
  Button,
  Modal,
  Input,
  Select,
  ConfirmDialog,
  Skeleton,
  ErrorState,
  Badge,
  FormError,
  PermissionGate,
} from '@/components/ui';
import { useTariffs } from '@/features/tariffs/api';

const itemSchema = z.object({
  itemCode: z.string().min(1, 'Item Code is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  unitOfMeasure: z.string().min(1, 'UOM is required'),
  defaultHsCode: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

export function ItemsListPage() {
  const localize = useUiText();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<
    'all' | 'true' | 'false'
  >('true');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deactivateItem, setDeactivateItem] = useState<Item | null>(null);

  const { data, isLoading, isError, refetch } = useItems({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    isActive: isActiveFilter === 'all' ? undefined : isActiveFilter === 'true',
  });

  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const deactivateMutation = useDeactivateItem();
  const { data: tariffs = [] } = useTariffs();
  const hsCodeOptions = Array.from(
    new Set(tariffs.map((tariff) => tariff.hsCode)),
  )
    .sort()
    .map((hsCode) => ({ label: hsCode, value: hsCode }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const openCreate = () => {
    setEditingItem(null);
    reset({
      itemCode: '',
      name: '',
      description: '',
      unitOfMeasure: 'PCS',
      defaultHsCode: '',
    });
    setIsFormOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    reset({
      itemCode: item.itemCode,
      name: item.name,
      description: item.description || '',
      unitOfMeasure: item.unitOfMeasure,
      defaultHsCode: item.defaultHsCode || '',
    });
    setIsFormOpen(true);
  };

  const onSubmit = (formData: ItemFormData) => {
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, data: formData },
        { onSuccess: () => setIsFormOpen(false) },
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setIsFormOpen(false),
      });
    }
  };

  const columns = [
    {
      header: 'Code',
      accessor: (row: Item) => (
        <span className="font-mono text-sm">{row.itemCode}</span>
      ),
    },
    { header: 'Name', accessor: 'name' as keyof Item, sortable: true },
    { header: 'UOM', accessor: 'unitOfMeasure' as keyof Item },
    { header: 'HS Code', accessor: (row: Item) => row.defaultHsCode || '-' },
    {
      header: 'Status',
      accessor: (row: Item) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          <LocalizedText text={row.isActive ? 'Active' : 'Inactive'} />
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Item) => (
        <div className="flex gap-2">
          <PermissionGate permission="items:write">
            <button
              onClick={() => openEdit(row)}
              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
            >
              <LocalizedText text={'\n            Edit\n          '} />
            </button>
          </PermissionGate>
          {row.isActive && (
            <PermissionGate permission="items:write">
              <button
                onClick={() => setDeactivateItem(row)}
                className="text-red-600 hover:text-red-900 font-medium text-sm"
              >
                <LocalizedText
                  text={'\n              Deactivate\n            '}
                />
              </button>
            </PermissionGate>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            <LocalizedText
              text={'\n            Materials & Products\n          '}
            />
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            <LocalizedText
              text={
                '\n            Master data for purchasable inventory items.\n          '
              }
            />
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <PermissionGate permission="items:write">
            <Button onClick={openCreate}>
              <LocalizedText text={'Add Item'} />
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="bg-white p-4 shadow sm:rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder={localize('Search by name or code...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            options={[
              { label: 'All Items', value: 'all' },
              { label: 'Active Only', value: 'true' },
              { label: 'Inactive Only', value: 'false' },
            ]}
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value as any);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : isError ? (
        <ErrorState
          message={localize('Failed to load items')}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="space-y-4">
          <Table columns={columns} data={data?.data || []} />

          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 shadow sm:rounded-lg">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  <LocalizedText text={'\n                  Showing'} />
                  <LocalizedText text={' '} />
                  <span className="font-medium">
                    {(page - 1) * 10 + 1}
                  </span>{' '}
                  <LocalizedText text={' to'} />
                  <LocalizedText text={' '} />
                  <span className="font-medium">
                    {Math.min(page * 10, data?.total || 0)}
                  </span>
                  <LocalizedText text={' '} />
                  <LocalizedText text={'\n                  of '} />
                  <span className="font-medium">{data?.total || 0}</span>
                  <LocalizedText text={' '} />
                  <LocalizedText
                    text={'\n                  results\n                '}
                  />
                </p>
              </div>
              <div>
                <nav
                  className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                  aria-label={localize('Pagination')}
                >
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <LocalizedText
                      text={
                        '\n                    Previous\n                  '
                      }
                    />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * 10 >= (data?.total || 0)}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <LocalizedText
                      text={'\n                    Next\n                  '}
                    />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormError error={createMutation.error || updateMutation.error} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={localize('Item Code *')}
              {...register('itemCode')}
              error={errors.itemCode?.message}
            />
            <Input
              label={localize('Name *')}
              {...register('name')}
              error={errors.name?.message}
            />
            <Input
              label={localize('Unit of Measure *')}
              {...register('unitOfMeasure')}
              error={errors.unitOfMeasure?.message}
              placeholder={localize('e.g. PCS, KG, L')}
            />
            <Select
              label={localize('Default HS Code')}
              options={[
                { label: localize('Select HS Code'), value: '' },
                ...hsCodeOptions,
              ]}
              {...register('defaultHsCode')}
              error={errors.defaultHsCode?.message}
            />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <LocalizedText
                  text={'\n                Description\n              '}
                />
              </label>
              <textarea
                className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                rows={3}
                {...register('description')}
              />
            </div>
          </div>

          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="w-full sm:ml-3 sm:w-auto"
            >
              <LocalizedText
                text={editingItem ? 'Save Changes' : 'Create Item'}
              />
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              <LocalizedText text={'\n              Cancel\n            '} />
            </Button>
          </div>
        </form>
      </Modal>

      {deactivateItem && (
        <ConfirmDialog
          isOpen={true}
          title={localize('Deactivate Item')}
          message={`Are you sure you want to deactivate ${deactivateItem.itemCode}? It will no longer appear in active dropdowns for new Purchase Orders.`}
          confirmText={localize('Deactivate')}
          isDestructive
          isLoading={deactivateMutation.isPending}
          onConfirm={() =>
            deactivateMutation.mutate(deactivateItem.id, {
              onSuccess: () => setDeactivateItem(null),
            })
          }
          onClose={() => setDeactivateItem(null)}
        />
      )}
    </div>
  );
}
