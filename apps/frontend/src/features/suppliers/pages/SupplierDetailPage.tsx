import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSupplier, useSupplierPurchaseOrders } from '../api';
import { Table, Badge, Skeleton, ErrorState } from '@/components/ui';
import { format } from 'date-fns';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState('profile');
  const [poPage, setPoPage] = useState(1);

  const {
    data: supplier,
    isLoading: isSupplierLoading,
    isError: isSupplierError,
  } = useSupplier(id as string);
  const { data: poData, isLoading: isPoLoading } = useSupplierPurchaseOrders(
    id as string,
    poPage,
    10,
  );

  if (isSupplierLoading) return <Skeleton className="h-[600px] w-full" />;
  if (isSupplierError || !supplier)
    return <ErrorState message="Failed to load supplier details" />;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'banks', label: 'Bank Accounts' },
    { id: 'pos', label: 'PO History' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'performance', label: 'Performance' },
  ];

  const bankColumns = [
    { header: 'Bank Name', accessor: 'bankName' as const },
    { header: 'SWIFT / BIC', accessor: 'swift' as const },
    { header: 'IBAN / Account', accessor: 'ibanOrAccount' as const },
    { header: 'Currency', accessor: 'currency' as const },
    {
      header: 'Default',
      accessor: (row: any) =>
        row.isDefault ? (
          <Badge variant="success">Yes</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        ),
    },
  ];

  const poColumns = [
    { header: 'PO Number', accessor: 'poNumber' as const },
    {
      header: 'Date',
      accessor: (row: any) => format(new Date(row.poDate), 'yyyy-MM-dd'),
    },
    {
      header: 'Status',
      accessor: (row: any) => (
        <Badge
          variant={
            row.status === 'draft'
              ? 'secondary'
              : row.status === 'approved'
                ? 'success'
                : 'info'
          }
        >
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Amount',
      accessor: (row: any) => (
        <span className="font-mono">
          {parseFloat(row.totalAmount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {row.currency}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {supplier.name}
              </h3>
              <Badge variant={supplier.isActive ? 'success' : 'danger'}>
                {supplier.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {supplier.country} &bull; TIN: {supplier.tin || 'N/A'}
            </p>
          </div>
          <Link
            to="/suppliers"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            &larr; Back to Suppliers
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
      </div>

      {/* Content */}
      <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
        {activeTab === 'profile' && (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">
                Contact Person
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {supplier.contactPerson || '-'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">
                Email Address
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {supplier.email || '-'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {supplier.phone || '-'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">
                Payment Terms
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {supplier.paymentTerms || '-'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">
                Default Currency
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {supplier.defaultCurrency}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Lead Time</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {supplier.leadTimeDays} days
              </dd>
            </div>
          </dl>
        )}

        {activeTab === 'banks' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Configured Bank Accounts
            </h4>
            <Table
              columns={bankColumns}
              data={(supplier.bankAccounts || []).filter((b) => b.isActive)}
            />
          </div>
        )}

        {activeTab === 'pos' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium text-gray-900">
                Purchase Order History
              </h4>
            </div>
            {isPoLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-4">
                <Table columns={poColumns} data={poData?.data || []} />
                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="text-sm text-gray-500">
                    Total: {poData?.total || 0}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPoPage((p) => Math.max(1, p - 1))}
                      disabled={poPage === 1}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      &larr; Prev
                    </button>
                    <button
                      onClick={() => setPoPage((p) => p + 1)}
                      disabled={poPage * 10 >= (poData?.total || 0)}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shipments' && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              Shipments linkage will be populated once Import Shipments feature
              is built.
            </p>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              KPI metrics (Average delivery time, variance ratios) will be
              aggregated here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
