import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShipment, useUpdateShipmentStatus, type Shipment } from '../api';
import { Badge, Skeleton, ErrorState } from '@/components/ui';
import { ChangeStatusButton } from '../components/ChangeStatusButton';
import { DocumentsTab } from '../components/DocumentsTab';
import { CommercialInvoiceTab } from '../components/CommercialInvoiceTab';
import { usePurchaseOrder } from '@/features/purchase-orders/api';

const STATUS_PIPELINE = [
  'ordered',
  'shipped',
  'at_customs',
  'cleared',
  'partially_received',
  'received',
];

export function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: shipmentData, isLoading, isError, refetch } = useShipment(id!);
  const updateStatus = useUpdateShipmentStatus();

  const [activeTab, setActiveTab] = useState<
    'documents' | 'invoice' | 'costs' | 'landed' | 'grn'
  >('documents');

  const shipment = shipmentData?.data;

  // We can fetch PO to show PO info if needed, or rely on Shipment items
  const { data: poData } = usePurchaseOrder(shipment?.poId || '');
  const po = poData;

  if (isLoading) return <Skeleton className="h-[800px] w-full" />;
  if (isError || !shipment)
    return (
      <ErrorState message="Failed to load shipment" onRetry={() => refetch()} />
    );

  const handleAdvanceStatus = async (nextStatus: Shipment['status']) => {
    try {
      await updateStatus.mutateAsync({ id: shipment.id, status: nextStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const currentIndex = STATUS_PIPELINE.indexOf(shipment.status);
  const nextStatus = STATUS_PIPELINE[currentIndex + 1] as
    Shipment['status'] | undefined;

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center gap-4">
            {shipment.shipmentNumber || 'DRAFT SHIPMENT'}
            <Badge variant="info">
              {shipment.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </h2>
          <p className="mt-1 text-sm text-gray-500 flex gap-4">
            <span>
              B/L:{' '}
              <strong className="text-gray-900">
                {shipment.blNumber || 'Pending'}
              </strong>
            </span>
            <span>
              Vessel:{' '}
              <strong className="text-gray-900">
                {shipment.vesselName || 'Pending'}
              </strong>
            </span>
            <span>
              Incoterm:{' '}
              <strong className="text-gray-900">{shipment.incoterm}</strong>
            </span>
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 gap-3">
          {nextStatus && (
            <ChangeStatusButton
              shipmentId={shipment.id}
              nextStatus={nextStatus}
            />
          )}
        </div>
      </div>

      {/* 6-Step Timeline */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 overflow-x-auto">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Transit Lifecycle
        </h3>
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {STATUS_PIPELINE.map((step, stepIdx) => {
              const isActive = shipment.status === step;
              const isPast = STATUS_PIPELINE.indexOf(shipment.status) > stepIdx;

              return (
                <li
                  key={step}
                  className={`relative pr-8 sm:pr-20 ${stepIdx === STATUS_PIPELINE.length - 1 ? 'pr-0 sm:pr-0' : ''}`}
                >
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div
                      className={`h-0.5 w-full ${isPast ? 'bg-blue-600' : 'bg-gray-200'}`}
                    />
                  </div>
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      isActive
                        ? 'border-blue-600 bg-white'
                        : isPast
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isPast ? (
                      <svg
                        className="h-5 w-5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : isActive ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                    )}
                  </div>
                  <span className="absolute -bottom-6 -ml-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                    {step.replace('_', ' ').toUpperCase()}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Routing & Release Info
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Route</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {shipment.portOfLoading || 'Unknown'} ➔{' '}
                    {shipment.portOfDestination || 'Unknown'}
                  </dd>
                </div>
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Estimated Arrival (ETA)
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">
                    {shipment.eta
                      ? new Date(shipment.eta).toLocaleDateString()
                      : 'N/A'}
                  </dd>
                </div>
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Containers
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div className="flex flex-wrap gap-2">
                      {shipment.containerNumbers?.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-1 text-xs font-medium bg-gray-100 border rounded"
                        >
                          {c}
                        </span>
                      ))}
                      {(!shipment.containerNumbers ||
                        shipment.containerNumbers.length === 0) &&
                        'No containers logged.'}
                    </div>
                  </dd>
                </div>
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Physical Dimensions
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {shipment.totalWeightKg
                      ? `${shipment.totalWeightKg} KG`
                      : 'Unknown KG'}{' '}
                    /{' '}
                    {shipment.totalVolumeCbm
                      ? `${shipment.totalVolumeCbm} CBM`
                      : 'Unknown CBM'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Line Items Manifest
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      Item ID
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      Shipped Qty
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      Unit Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shipment.items?.map((item) => {
                    const poLine = po?.poLines?.find(
                      (l: any) => l.id === item.poLineId,
                    );
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {poLine?.item?.name || 'Unknown Item'}{' '}
                          <span className="text-xs text-gray-500 block">
                            {poLine?.item?.itemCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {item.shippedQuantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {item.ciUnitPrice}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Linking */}
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Linked Records
              </h3>
            </div>
            <div className="px-4 py-5 space-y-4">
              <div className="p-3 border rounded bg-blue-50">
                <p className="text-xs text-blue-800 font-bold uppercase mb-1">
                  Purchase Order
                </p>
                <Link
                  to={`/purchase-orders`}
                  className="text-sm font-medium text-blue-900 hover:underline"
                >
                  {po?.poNumber || 'Loading...'}
                </Link>
              </div>

              {shipment.lcId && (
                <div className="p-3 border rounded bg-indigo-50">
                  <p className="text-xs text-indigo-800 font-bold uppercase mb-1">
                    Letter of Credit
                  </p>
                  <Link
                    to={`/letters-of-credit/${shipment.lcId}`}
                    className="text-sm font-medium text-indigo-900 hover:underline"
                  >
                    View Instrument (ID: {shipment.lcId.split('-')[0]})
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Core Operational Tabs */}
      <div className="bg-white shadow rounded-lg border border-gray-200 mt-8">
        <div className="border-b border-gray-200 px-4">
          <nav
            className="-mb-px flex space-x-8 overflow-x-auto"
            aria-label="Tabs"
          >
            {[
              { id: 'documents', label: 'Documents' },
              { id: 'invoice', label: 'Commercial Invoice' },
              { id: 'costs', label: 'Cost Register (AC04)' },
              { id: 'landed', label: 'Landed Cost Engine' },
              { id: 'grn', label: 'GRN & Warehouse' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'documents' && (
            <DocumentsTab shipmentId={shipment.id} />
          )}
          {activeTab === 'invoice' && (
            <CommercialInvoiceTab shipment={shipment} />
          )}
          {activeTab === 'costs' && (
            <div className="text-center py-12 text-gray-500">
              <p>AC04 Cost Register Pane will mount here.</p>
              <p className="text-xs mt-2">
                Bank Charges, Clearing Agent Fees, Storage Fees sync here.
              </p>
            </div>
          )}
          {activeTab === 'landed' && (
            <div className="text-center py-12 text-gray-500">
              <p>Landed Cost Calculation Engine will mount here.</p>
              <p className="text-xs mt-2">
                Proportional cost mapping (By Value / By Volume / By Weight).
              </p>
            </div>
          )}
          {activeTab === 'grn' && (
            <div className="text-center py-12 text-gray-500">
              <p>Warehouse GRN Pane will mount here.</p>
              <p className="text-xs mt-2">
                Physical receiving and condition checks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
