import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Table,
  Badge,
  Select,
  Skeleton,
  ErrorState,
  Input,
  PermissionGate,
} from '@/components/ui';
import {
  mapPurchaseOrderStatusFilter,
  usePurchaseOrders,
  type PurchaseOrder,
  type PoStatus,
} from '../api';
import { useSuppliers } from '@/features/suppliers/api';
import { PurchaseOrderWizard } from '../components/PurchaseOrderWizard';
import { format } from 'date-fns';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_approval', label: 'Pending Approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'lc_applied', label: 'LC Applied' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'partially_received', label: 'Partially Received' },
  { id: 'closed', label: 'Closed' },
];

export function PurchaseOrdersListPage() {
  const localize = useUiText();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState(() => {
    const requestedStatus = searchParams.get('status');
    const normalizedStatus =
      requestedStatus === 'processing' ? 'lc_applied' : requestedStatus;
    return STATUS_TABS.some((tab) => tab.id === normalizedStatus)
      ? normalizedStatus!
      : 'all';
  });
  const [supplierId, setSupplierId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // We only fetch active suppliers for filtering to match business rules,
  // but wait, historical POs might have inactive suppliers. So for the filter,
  // maybe we should fetch all suppliers? Let's use all suppliers for filtering,
  // and active only for creation.
  const { data: allSuppliers } = useSuppliers({ limit: 1000 });

  const { data, isLoading, isError, refetch } = usePurchaseOrders({
    page,
    limit: 10,
    status:
      activeTab === 'all' ? undefined : mapPurchaseOrderStatusFilter(activeTab),
    supplierId: supplierId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const getStatusBadge = (status: PoStatus) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="secondary">
            <LocalizedText text={'Draft'} />
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge variant="warning">
            <LocalizedText text={'Pending Approval'} />
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="success">
            <LocalizedText text={'Approved'} />
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger">
            <LocalizedText text={'Rejected'} />
          </Badge>
        );
      case 'lc_applied':
      case 'processing':
        return (
          <Badge variant="info">
            <LocalizedText text={'LC Applied'} />
          </Badge>
        );
      case 'shipped':
        return (
          <Badge variant="info">
            <LocalizedText text={'Shipped'} />
          </Badge>
        );
      case 'partially_received':
        return (
          <Badge variant="warning">
            <LocalizedText text={'Partial Receipt'} />
          </Badge>
        );
      case 'fully_received':
        return (
          <Badge variant="success">
            <LocalizedText text={'Fully Received'} />
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary">
            <LocalizedText text={'Closed'} />
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'PO Number',
      accessor: (row: PurchaseOrder) => (
        <Link
          to={`/purchase-orders/${row.id}`}
          className="font-mono text-blue-600 hover:underline"
        >
          {row.poNumber}
        </Link>
      ),
    },
    {
      header: 'Date',
      accessor: (row: PurchaseOrder) =>
        format(new Date(row.poDate), 'MMM dd, yyyy'),
    },
    {
      header: 'Supplier',
      accessor: (row: PurchaseOrder) => row.supplier?.name || '-',
    },
    {
      header: 'Amount',
      accessor: (row: PurchaseOrder) => (
        <span className="font-mono">
          {parseFloat(row.totalAmount).toLocaleString(undefined, {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          })}
          <LocalizedText text={' '} />
          {row.currency}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: PurchaseOrder) => getStatusBadge(row.status),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            <LocalizedText text={'\n            Purchase Orders\n          '} />
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            <LocalizedText
              text={
                '\n            Track and manage import purchase orders and approvals.\n          '
              }
            />
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <PermissionGate permission="po:write">
            <Button onClick={() => setIsFormOpen(true)}>
              <LocalizedText text={'Create PO'} />
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex space-x-6 overflow-x-auto"
          aria-label={localize('Tabs')}
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
                setSearchParams(tab.id === 'all' ? {} : { status: tab.id });
              }}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 shadow sm:rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <Select
            label={localize('Supplier Filter')}
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Suppliers', value: '' },
              ...(allSuppliers?.data || []).map((s) => ({
                label: s.name,
                value: s.id,
              })),
            ]}
          />
        </div>
        <div>
          <Input
            type="date"
            label={localize('From Date')}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              type="date"
              label={localize('To Date')}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {(supplierId || startDate || endDate) && (
            <Button
              variant="secondary"
              onClick={() => {
                setSupplierId('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
            >
              <LocalizedText text={'\n              Clear\n            '} />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : isError ? (
        <ErrorState
          message={localize('Failed to load purchase orders')}
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

      {/* PO Form is intentionally mounted but conditionally opened */}
      <PurchaseOrderWizard
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  );
}
