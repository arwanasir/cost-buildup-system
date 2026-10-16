import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShipments } from '../api';
import { useSuppliers } from '@/features/suppliers/api';
import { usePurchaseOrders } from '@/features/purchase-orders/api';
import {
  Button,
  Input,
  Select,
  Badge,
  Skeleton,
  ErrorState,
  PermissionGate,
} from '@/components/ui';

const TABS = [
  { name: 'All', value: '' },
  { name: 'Ordered', value: 'ordered' },
  { name: 'Shipped', value: 'shipped' },
  { name: 'At Customs', value: 'at_customs' },
  { name: 'Cleared', value: 'cleared' },
  { name: 'Partially Received', value: 'partially_received' },
  { name: 'Received', value: 'received' },
];

export function ShipmentsListPage() {
  const [statusTab, setStatusTab] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [poId, setPoId] = useState<string>('');
  const [etaStart, setEtaStart] = useState<string>('');
  const [etaEnd, setEtaEnd] = useState<string>('');

  const {
    data: shipmentsData,
    isLoading,
    isError,
    refetch,
  } = useShipments({
    status: statusTab || undefined,
    supplierId: supplierId || undefined,
    poId: poId || undefined,
    etaStart: etaStart || undefined,
    etaEnd: etaEnd || undefined,
  });

  const { data: suppliersData } = useSuppliers();
  const { data: posData } = usePurchaseOrders({ status: 'approved' }); // or all POs

  const shipments = shipmentsData?.data || [];
  const suppliers = suppliersData?.data || [];
  const pos = posData?.data || [];

  const supplierOptions = [
    { label: 'All Suppliers', value: '' },
    ...suppliers.map((s) => ({ label: s.name, value: s.id })),
  ];

  const poOptions = [
    { label: 'All Purchase Orders', value: '' },
    ...pos.map((po) => ({ label: po.poNumber, value: po.id })),
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between bg-white p-6 rounded-lg shadow border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Import Shipments
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage incoming sea and air freight manifests.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 flex gap-3">
          <PermissionGate permission="shipment:write">
            <Link to="/shipments/new">
              <Button variant="primary">Create Shipment</Button>
            </Link>
          </PermissionGate>
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-6">
        {/* Status Tabs */}
        <div className="border-b border-gray-200">
          <nav
            className="-mb-px flex space-x-8 overflow-x-auto"
            aria-label="Tabs"
          >
            {TABS.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setStatusTab(tab.value)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    statusTab === tab.value
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Supplier"
            options={supplierOptions}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          />
          <Select
            label="Purchase Order"
            options={poOptions}
            value={poId}
            onChange={(e) => setPoId(e.target.value)}
          />
          <Input
            label="ETA From"
            type="date"
            value={etaStart}
            onChange={(e) => setEtaStart(e.target.value)}
          />
          <Input
            label="ETA To"
            type="date"
            value={etaEnd}
            onChange={(e) => setEtaEnd(e.target.value)}
          />
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <Skeleton className="h-[400px]" />
        ) : isError ? (
          <ErrorState
            message="Failed to load shipments."
            onRetry={() => refetch()}
          />
        ) : shipments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No shipments found matching the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Shipment No (B/L)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Supplier
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ETA
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipments.map((shipment) => {
                  const isOverdue =
                    shipment.eta &&
                    new Date(shipment.eta) < new Date() &&
                    shipment.status === 'shipped';

                  // Extract supplier name manually if backend doesn't populate nested supplier object
                  // In a real app, backend findAll usually includes supplier relation
                  const supplierName =
                    suppliers.find((s) => s.id === shipment.supplierId)?.name ||
                    'Unknown Supplier';

                  return (
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {shipment.shipmentNumber}
                        </div>
                        {shipment.blNumber && (
                          <div className="text-xs text-gray-500">
                            B/L: {shipment.blNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {supplierName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm ${isOverdue ? 'font-bold text-red-600' : 'text-gray-900'}`}
                        >
                          {shipment.eta
                            ? new Date(shipment.eta).toLocaleDateString()
                            : 'N/A'}
                        </div>
                        {isOverdue && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            shipment.status === 'partially_received' ||
                            shipment.status === 'received'
                              ? 'success'
                              : shipment.status === 'ordered'
                                ? 'secondary'
                                : 'info'
                          }
                        >
                          {shipment.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/shipments/${shipment.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                          <span className="sr-only">
                            , {shipment.shipmentNumber}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
