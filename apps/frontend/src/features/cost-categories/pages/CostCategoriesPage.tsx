import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import {
  useCostCategories,
  useCreateCostCategory,
  useUpdateCostCategory,
  useToggleCostCategoryActive,
  type CostCategory,
} from '../api';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  Button,
  Modal,
  Input,
  Select,
  ConfirmDialog,
  Badge,
  Skeleton,
  ErrorState,
  FormError,
  PermissionGate,
} from '@/components/ui';

const ALLOCATION_METHODS = [
  { label: 'By Value', value: 'by_value' },
  { label: 'By Weight', value: 'by_weight' },
  { label: 'By Volume', value: 'by_volume' },
  { label: 'By Quantity', value: 'by_quantity' },
  { label: 'Equal Split', value: 'equal_split' },
];

// --- Schemas ---
const categorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  defaultAllocationMethod: z.string().optional(),
  isItemSpecific: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export function CostCategoriesPage() {
  const localize = useUiText();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(
    null,
  );

  const [deactivateCategory, setDeactivateCategory] =
    useState<CostCategory | null>(null);

  const { data: categories, isLoading, isError, refetch } = useCostCategories();
  const createMutation = useCreateCostCategory();
  const updateMutation = useUpdateCostCategory();
  const toggleActiveMutation = useToggleCostCategoryActive();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const openCreate = () => {
    setEditingCategory(null);
    reset({
      code: '',
      name: '',
      defaultAllocationMethod: 'by_value',
      isItemSpecific: false,
      sortOrder: 0,
    });
    setIsFormOpen(true);
  };

  const openEdit = (cat: CostCategory) => {
    setEditingCategory(cat);
    reset({
      code: cat.code,
      name: cat.name,
      defaultAllocationMethod: cat.defaultAllocationMethod || 'by_value',
      isItemSpecific: cat.isItemSpecific,
      sortOrder: cat.sortOrder,
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory)
      updateMutation.mutate(
        { id: editingCategory.id, data },
        { onSuccess: () => setIsFormOpen(false) },
      );
    else createMutation.mutate(data, { onSuccess: () => setIsFormOpen(false) });
  };

  const columns = [
    { header: 'Code', accessor: 'code' as keyof CostCategory, sortable: true },
    { header: 'Name', accessor: 'name' as keyof CostCategory, sortable: true },
    {
      header: 'Allocation Method',
      accessor: (row: CostCategory) => {
        const method = ALLOCATION_METHODS.find(
          (m) => m.value === row.defaultAllocationMethod,
        );
        return method ? method.label : row.defaultAllocationMethod;
      },
    },
    {
      header: 'Item Specific',
      accessor: (row: CostCategory) => (row.isItemSpecific ? 'Yes' : 'No'),
    },
    {
      header: 'Status',
      accessor: (row: CostCategory) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          <LocalizedText text={row.isActive ? 'Active' : 'Inactive'} />
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: CostCategory) => (
        <PermissionGate permission="admin:all">
          <div className="flex gap-2">
            <button
              onClick={() => openEdit(row)}
              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
            >
              <LocalizedText text={'\n            Edit\n          '} />
            </button>
            {row.isActive ? (
              <button
                onClick={() => setDeactivateCategory(row)}
                className="text-red-600 hover:text-red-900 font-medium text-sm"
              >
                <LocalizedText
                  text={'\n              Deactivate\n            '}
                />
              </button>
            ) : (
              <button
                onClick={() =>
                  toggleActiveMutation.mutate({ id: row.id, isActive: true })
                }
                className="text-green-600 hover:text-green-900 font-medium text-sm"
                disabled={toggleActiveMutation.isPending}
              >
                <LocalizedText text={'\n              Activate\n            '} />
              </button>
            )}
          </div>
        </PermissionGate>
      ),
    },
  ];

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (isError)
    return (
      <ErrorState
        message={localize('Failed to load cost categories')}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            <LocalizedText text={'\n            Cost Categories\n          '} />
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            <LocalizedText
              text={
                '\n            Manage Landed Cost categories and their default allocation rules.\n          '
              }
            />
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <PermissionGate permission="admin:all">
            <Button onClick={openCreate}>
              <LocalizedText text={'Add Category'} />
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Table
        columns={columns}
        data={(categories || []).sort((a, b) => a.sortOrder - b.sortOrder)}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCategory ? 'Edit Cost Category' : 'Add Cost Category'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormError error={createMutation.error || updateMutation.error} />
          <Input
            label={localize('Code')}
            {...register('code')}
            error={errors.code?.message}
            placeholder={localize('e.g. FOB')}
          />
          <Input
            label={localize('Name')}
            {...register('name')}
            error={errors.name?.message}
            placeholder={localize('e.g. Freight on Board')}
          />

          <Select
            label={localize('Default Allocation Method')}
            options={ALLOCATION_METHODS}
            {...register('defaultAllocationMethod')}
            error={errors.defaultAllocationMethod?.message}
          />

          <div className="flex items-center gap-2 mt-4">
            <Controller
              name="isItemSpecific"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
            <label className="text-sm font-medium text-gray-700">
              <LocalizedText
                text={'\n              Is Item Specific?\n            '}
              />
            </label>
          </div>

          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="w-full sm:ml-3 sm:w-auto"
            >
              <LocalizedText
                text={editingCategory ? 'Save Changes' : 'Create Category'}
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

      <ConfirmDialog
        isOpen={!!deactivateCategory}
        title={localize('Deactivate Cost Category')}
        message={`Are you sure you want to deactivate ${deactivateCategory?.name}? It will no longer be available when adding costs to new shipments.`}
        confirmText={localize('Deactivate')}
        isDestructive
        isLoading={toggleActiveMutation.isPending}
        onConfirm={() =>
          deactivateCategory &&
          toggleActiveMutation.mutate(
            { id: deactivateCategory.id, isActive: false },
            { onSuccess: () => setDeactivateCategory(null) },
          )
        }
        onClose={() => setDeactivateCategory(null)}
      />
    </div>
  );
}
