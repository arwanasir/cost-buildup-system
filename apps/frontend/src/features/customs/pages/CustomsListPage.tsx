import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomsDeclarations } from '../api';
import { Badge, Button, Input, Skeleton } from '@/components/ui';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'assessed', label: 'Assessed' },
  { id: 'paid', label: 'Paid' },
  { id: 'released', label: 'Released' },
];

export function CustomsListPage() {
  const [statusTab, setStatusTab] = useState('all');
  const [shipmentIdFilter, setShipmentIdFilter] = useState('');

  const { data: declarations, isLoading } = useCustomsDeclarations({
    status: statusTab === 'all' ? undefined : statusTab,
    shipmentId: shipmentIdFilter || undefined,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Customs Declarations
        </h1>
        <Link to="/customs/new">
          <Button variant="primary">New Declaration</Button>
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex space-x-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  statusTab === tab.id
                    ? 'bg-primary-100 text-primary-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <Input
              placeholder="Filter by Shipment ID..."
              value={shipmentIdFilter}
              onChange={(e) => setShipmentIdFilter(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-48" />
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
                    Decl #
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Agent
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    CIF (ETB)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total Tax (ETB)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {declarations?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No declarations found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  declarations?.map((decl) => (
                    <tr key={decl.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        <Link to={`/customs/${decl.id}`}>
                          {decl.declarationNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {decl.declarationDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {decl.clearingAgent || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {parseFloat(decl.cifValueEtb).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        {parseFloat(decl.totalAssessmentEtb).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            decl.status === 'released'
                              ? 'success'
                              : decl.status === 'paid'
                                ? 'primary'
                                : decl.status === 'assessed'
                                  ? 'warning'
                                  : 'secondary'
                          }
                        >
                          {decl.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/customs/${decl.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
