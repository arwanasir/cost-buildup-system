import React, { useState } from 'react';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Tabs,
  Table,
  ErrorState,
} from '@/components/ui';
import { useGrns } from '../api';
import { useNavigate } from 'react-router-dom';

export function GoodsReceiptsListPage() {
  const { data: grnsResponse, isLoading, isError, refetch } = useGrns();
  const [activeTab, setActiveTab] = useState('draft');
  const navigate = useNavigate();

  const grns = Array.isArray(grnsResponse)
    ? grnsResponse
    : grnsResponse?.data || [];

  const TABS = [
    { id: 'draft', label: 'Draft' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'posting_failed', label: 'Posting Failed' },
    { id: 'posted', label: 'Posted' },
    { id: 'flagged_for_adjustment', label: 'Flagged for Adj' },
  ];

  const filteredGrns = grns.filter((grn: any) => grn.status === activeTab);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="default">Draft</Badge>;
      case 'confirmed':
        return <Badge variant="info">Confirmed</Badge>;
      case 'posting_failed':
        return <Badge variant="danger">Posting Failed</Badge>;
      case 'posted':
        return <Badge variant="success">Posted</Badge>;
      case 'flagged_for_adjustment':
        return <Badge variant="warning">Flagged</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <PageHeader
          title="Goods Receipts (GRN)"
          description="Manage inventory receiving, discrepancies, and ERP posting."
        />
        <Button
          variant="primary"
          onClick={() => navigate('/goods-receipts/new')}
        >
          + New GRN
        </Button>
      </div>

      <Card className="p-0 bg-white shadow-sm border overflow-hidden">
        <div className="border-b px-4">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading Goods Receipts...
          </div>
        ) : isError ? (
          <ErrorState
            message="The GRN service could not be reached. Try again, or check the API and database services."
            onRetry={() => refetch()}
          />
        ) : filteredGrns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {activeTab.replace('_', ' ')} GRNs found.
          </div>
        ) : (
          <>
            {/* Tablet/Mobile Layout (< 768px) */}
            <div className="md:hidden divide-y">
              {filteredGrns.map((grn: any) => (
                <div key={grn.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {grn.grnNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Date: {new Date(grn.receiptDate).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(grn.status)}
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Warehouse:</span>{' '}
                    {grn.warehouseLocation}
                  </div>
                  {grn.usesEstimatedCost && (
                    <div className="mt-1">
                      <span className="inline-flex items-center text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Estimated Costs Applied
                      </span>
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/goods-receipts/${grn.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Layout (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      GRN Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Receipt Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Warehouse
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Flags
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredGrns.map((grn: any) => (
                    <tr key={grn.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {grn.grnNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(grn.receiptDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {grn.warehouseLocation}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(grn.status)}
                      </td>
                      <td className="px-4 py-3">
                        {grn.usesEstimatedCost ? (
                          <span className="inline-flex items-center text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded uppercase">
                            Est. Cost
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/goods-receipts/${grn.id}`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
