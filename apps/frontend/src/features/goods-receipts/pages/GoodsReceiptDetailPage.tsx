import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Table,
  Tabs,
  ErrorState,
} from '@/components/ui';
import { useState } from 'react';
import { ClaimsTab } from '../components/ClaimsTab';
import {
  useGrn,
  useConfirmGrn,
  usePostGrnToErp,
  useRetryGrnPosting,
} from '../api';

export function GoodsReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('items');
  const navigate = useNavigate();

  const { data: grnData, isLoading, isError, refetch } = useGrn(id || '');
  const confirmMutation = useConfirmGrn();
  const postMutation = usePostGrnToErp();
  const retryMutation = useRetryGrnPosting();

  if (isLoading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading GRN Details...
      </div>
    );
  if (isError)
    return (
      <ErrorState
        message="The goods receipt could not be loaded. Try again, or return to the GRN list."
        onRetry={() => refetch()}
      />
    );
  if (!grnData)
    return <div className="p-8 text-center text-red-500">GRN Not Found</div>;

  const { grn, items } = grnData;

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync(grn.id);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to confirm GRN');
    }
  };

  const handlePost = async () => {
    try {
      await postMutation.mutateAsync(grn.id);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to post GRN to ERP');
    }
  };

  const handleRetry = async () => {
    try {
      await retryMutation.mutateAsync(grn.id);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to retry posting');
    }
  };

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
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <PageHeader
          title={`Goods Receipt: ${grn.grnNumber}`}
          description={`Date: ${new Date(grn.receiptDate).toLocaleDateString()} | Warehouse: ${grn.warehouseLocation}`}
        />
        <div className="flex flex-col items-end gap-2">
          {getStatusBadge(grn.status)}

          <div className="flex gap-2 mt-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/goods-receipts')}
            >
              Back
            </Button>
            {grn.status === 'draft' && (
              <Button
                variant="primary"
                onClick={handleConfirm}
                isLoading={confirmMutation.isPending}
              >
                Confirm GRN
              </Button>
            )}
            {grn.status === 'confirmed' && (
              <Button
                variant="success"
                onClick={handlePost}
                isLoading={postMutation.isPending}
              >
                Post to ERP
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status Panel */}
      <Card className="p-4 bg-gray-50 border shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-gray-800">ERP Sync Status</h4>
            <p className="text-sm text-gray-600">
              {grn.status === 'posted'
                ? `Posted to Inventory Ledger on ${new Date(grn.postedAt).toLocaleString()}`
                : grn.status === 'posting_failed'
                  ? 'The last ERP sync attempt failed due to an API or validation error.'
                  : 'Not yet posted to ERP.'}
            </p>
          </div>
          {grn.status === 'posting_failed' && (
            <Button
              variant="danger"
              onClick={handleRetry}
              isLoading={retryMutation.isPending}
            >
              Retry ERP Sync
            </Button>
          )}
        </div>
      </Card>

      {/* Tab Navigation */}
      <Card className="p-0 bg-white border shadow-sm overflow-hidden">
        <div className="border-b px-4">
          <Tabs
            tabs={[
              { id: 'items', label: 'Received Items & Costing' },
              { id: 'claims', label: 'Claims & Discrepancies (BR13)' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {activeTab === 'items' && (
          <div className="overflow-x-auto">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Cost Basis</h3>
              <div className="flex gap-2">
                {grn.usesEstimatedCost ? (
                  <Badge variant="warning">
                    Basis: Estimated Costs Applied
                  </Badge>
                ) : (
                  <Badge variant="success">Basis: Finalized Landed Costs</Badge>
                )}
                {grn.status === 'flagged_for_adjustment' && (
                  <Badge variant="danger">Adjustments Pending</Badge>
                )}
              </div>
            </div>
            <Table>
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Item ID
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Qty Recv
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                    Quarantine
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Unit Cost (ETB)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Line Value (ETB)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.shipmentItemId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {parseFloat(item.receivedQuantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.inspectionResult === 'accepted' ? (
                        <span className="inline-flex items-center text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Accepted
                        </span>
                      ) : item.inspectionResult === 'rejected' ? (
                        <span className="inline-flex items-center text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          Partial
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.quarantineFlag ? (
                        <Badge
                          variant="warning"
                          className="text-[10px] uppercase"
                        >
                          Quarantined
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">
                      {parseFloat(item.perUnitLandedCostEtb).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 6 },
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                      {parseFloat(item.lineValueEtb).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {activeTab === 'claims' && <ClaimsTab grnId={grn.id} />}
      </Card>
    </div>
  );
}
