import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSuppliers, useDeactivateSupplier, type Supplier } from '../api';
import { SupplierFormModal } from '../components/SupplierFormModal';
import {
  Table,
  Button,
  Input,
  Select,
  ConfirmDialog,
  Skeleton,
  ErrorState,
  Badge,
  PermissionGate,
} from '@/components/ui';

const CURRENCIES = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' },
  { label: 'CNY', value: 'CNY' },
  { label: 'AED', value: 'AED' },
];

export function SuppliersListPage() {
  const localize = useUiText();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<
    'all' | 'true' | 'false'
  >('true');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deactivateSupplier, setDeactivateSupplier] = useState<Supplier | null>(
    null,
  );

  const { data, isLoading, isError, refetch } = useSuppliers({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    isActive: isActiveFilter === 'all' ? undefined : isActiveFilter === 'true',
  });

  const deactivateMutation = useDeactivateSupplier();

  // Handle Search Debounce
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const openCreate = () => {
    setEditingSupplier(null);
    setIsFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const columns = [
    {
      header: 'Name',
      accessor: (row: Supplier) => (
        <PermissionGate
          permission="suppliers:write"
          fallback={
            <Link
              to={`/suppliers/${row.id}`}
              className="font-medium text-blue-700 hover:underline"
            >
              {row.name}
            </Link>
          }
        >
          <button
            type="button"
            onClick={() => openEdit(row)}
            aria-label={`${localize('Edit supplier')}: ${row.name}`}
            className="text-left font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
          >
            {row.name}
          </button>
        </PermissionGate>
      ),
    },
    { header: 'Country', accessor: 'country' as keyof Supplier },
    { header: 'Currency', accessor: 'defaultCurrency' as keyof Supplier },
    {
      header: 'Lead Time',
      accessor: (row: Supplier) => `${row.leadTimeDays} days`,
    },
    {
      header: 'Status',
      accessor: (row: Supplier) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          <LocalizedText text={row.isActive ? 'Active' : 'Inactive'} />
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Supplier) => (
        <div className="flex gap-2">
          <PermissionGate permission="suppliers:write">
            <button
              onClick={() => openEdit(row)}
              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
            >
              <LocalizedText text={'\n            Edit\n          '} />
            </button>
          </PermissionGate>
          {row.isActive && (
            <PermissionGate permission="suppliers:write">
              <button
                onClick={() => setDeactivateSupplier(row)}
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
            <LocalizedText text={'Suppliers'} />
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            <LocalizedText
              text={
                '\n            Manage vendor directory, payment terms, and lead times.\n          '
              }
            />
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <PermissionGate permission="suppliers:write">
            <Button onClick={openCreate}>
              <LocalizedText text={'New Supplier'} />
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="bg-white p-4 shadow sm:rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder={localize('Search by name, TIN, or country...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            options={[
              { label: 'All Suppliers', value: 'all' },
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
          message={localize('Failed to load suppliers')}
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

      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        supplier={editingSupplier}
      />

      {deactivateSupplier && (
        <ConfirmDialog
          isOpen={true}
          title={localize('Deactivate Supplier')}
          message={`Are you sure you want to deactivate ${deactivateSupplier.name}? They will no longer appear in active dropdowns for new Purchase Orders.`}
          confirmText={localize('Deactivate')}
          isDestructive
          isLoading={deactivateMutation.isPending}
          onConfirm={() =>
            deactivateMutation.mutate(deactivateSupplier.id, {
              onSuccess: () => setDeactivateSupplier(null),
            })
          }
          onClose={() => setDeactivateSupplier(null)}
        />
      )}
    </div>
  );
}
