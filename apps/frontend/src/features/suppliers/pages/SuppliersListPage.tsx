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
} from '@/components/ui';

const CURRENCIES = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' },
  { label: 'CNY', value: 'CNY' },
  { label: 'AED', value: 'AED' },
];

export function SuppliersListPage() {
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
        <Link
          to={`/suppliers/${row.id}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {row.name}
        </Link>
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
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Supplier) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEdit(row)}
            className="text-blue-600 hover:text-blue-900 font-medium text-sm"
          >
            Edit
          </button>
          {row.isActive && (
            <button
              onClick={() => setDeactivateSupplier(row)}
              className="text-red-600 hover:text-red-900 font-medium text-sm"
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Suppliers</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage vendor directory, payment terms, and lead times.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={openCreate}>New Supplier</Button>
        </div>
      </div>

      <div className="bg-white p-4 shadow sm:rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name, TIN, or country..."
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
          message="Failed to load suppliers"
          onRetry={() => refetch()}
        />
      ) : (
        <div className="space-y-4">
          <Table columns={columns} data={data?.data || []} />

          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 shadow sm:rounded-lg">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(page * 10, data?.total || 0)}
                  </span>{' '}
                  of <span className="font-medium">{data?.total || 0}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * 10 >= (data?.total || 0)}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    Next
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
          title="Deactivate Supplier"
          message={`Are you sure you want to deactivate ${deactivateSupplier.name}? They will no longer appear in active dropdowns for new Purchase Orders.`}
          confirmText="Deactivate"
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
