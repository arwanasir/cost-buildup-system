import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
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
import { BackButton } from '@/components/ui/BackButton';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useAuthStore } from '@/store/auth.store';
import { ClaimsTab } from '../components/ClaimsTab';
import { formatAmount4 } from '@/lib/money';
import {
  useGrn,
  useConfirmGrn,
  usePostGrnToErp,
  useRetryGrnPosting,
  usePendingGrnAdjustment,
  useApproveGrnAdjustment,
} from '../api';

export function GoodsReceiptDetailPage() {
  const localize = useUiText();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('items');
  const navigate = useNavigate();
  const hasCostFinalizePermission = useAuthStore((state) =>
    state.hasPermission('cost:finalize'),
  );

  const { data: grnData, isLoading, isError, refetch } = useGrn(id || '');
  const confirmMutation = useConfirmGrn();
  const postMutation = usePostGrnToErp();
  const retryMutation = useRetryGrnPosting();
  const { data: pendingAdjustment } = usePendingGrnAdjustment(
    id || '',
    hasCostFinalizePermission,
  );
  const approveAdjustmentMutation = useApproveGrnAdjustment();

  if (isLoading)
    return (
      <div className="p-8 text-center text-gray-500">
        <LocalizedText text={'\n        Loading GRN Details...\n      '} />
      </div>
    );
  if (isError)
    return (
      <ErrorState
        message={localize(
          'The goods receipt could not be loaded. Try again, or return to the GRN list.',
        )}
        onRetry={() => refetch()}
      />
    );
  if (!grnData)
    return (
      <div className="p-8 text-center text-red-500">
        <LocalizedText text={'GRN Not Found'} />
      </div>
    );

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

  const handleApproveAdjustment = async () => {
    try {
      await approveAdjustmentMutation.mutateAsync(grn.id);
    } catch (e: any) {
      alert(
        e.response?.data?.message ||
          'Failed to approve and post the final cost adjustment',
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="default">
            <LocalizedText text={'Draft'} />
          </Badge>
        );
      case 'confirmed':
        return (
          <Badge variant="info">
            <LocalizedText text={'Confirmed'} />
          </Badge>
        );
      case 'posting_failed':
        return (
          <Badge variant="danger">
            <LocalizedText text={'Posting Failed'} />
          </Badge>
        );
      case 'posted':
        return (
          <Badge variant="success">
            <LocalizedText text={'Posted'} />
          </Badge>
        );
      case 'flagged_for_adjustment':
        return (
          <Badge variant="warning">
            <LocalizedText text={'Flagged'} />
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <BackButton to="/goods-receipts" label="Back to goods receipts" />
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
              <LocalizedText text={'\n              Back\n            '} />
            </Button>
            {grn.status === 'draft' && (
              <Button
                variant="primary"
                onClick={handleConfirm}
                isLoading={confirmMutation.isPending}
              >
                <LocalizedText
                  text={'\n                Confirm GRN\n              '}
                />
              </Button>
            )}
            {grn.status === 'confirmed' && (
              <Button
                variant="success"
                onClick={handlePost}
                isLoading={postMutation.isPending}
              >
                <LocalizedText
                  text={'\n                Post to ERP\n              '}
                />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status Panel */}
      <Card className="p-4 bg-gray-50 border shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-gray-800">
              <LocalizedText text={'ERP Sync Status'} />
            </h4>
            <p className="text-sm text-gray-600">
              <LocalizedText
                text={
                  grn.usesEstimatedCost && grn.postedAt
                    ? 'Inventory was posted using estimated costs. Final cost adjustment approval is pending.'
                    : grn.status === 'posted'
                      ? `Posted to Inventory Ledger on ${new Date(grn.postedAt).toLocaleString()}`
                      : grn.status === 'posting_failed'
                        ? 'The last ERP sync attempt failed due to an API or validation error.'
                        : 'Not yet posted to ERP.'
                }
              />
            </p>
          </div>
          {grn.status === 'posting_failed' && (
            <Button
              variant="danger"
              onClick={handleRetry}
              isLoading={retryMutation.isPending}
            >
              <LocalizedText
                text={'\n              Retry ERP Sync\n            '}
              />
            </Button>
          )}
          {pendingAdjustment && (
            <PermissionGate permission="cost:finalize">
              <Button
                variant="primary"
                onClick={handleApproveAdjustment}
                isLoading={approveAdjustmentMutation.isPending}
              >
                <LocalizedText
                  text={'Approve and post final cost adjustment'}
                />
              </Button>
            </PermissionGate>
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
              <h3 className="font-bold text-gray-800">
                <LocalizedText text={'Cost Basis'} />
              </h3>
              <div className="flex gap-2">
                {grn.usesEstimatedCost ? (
                  <Badge variant="warning">
                    <LocalizedText
                      text={
                        '\n                    Basis: Estimated Costs Applied\n                  '
                      }
                    />
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <LocalizedText text={'Basis: Finalized Landed Costs'} />
                  </Badge>
                )}
                {grn.status === 'flagged_for_adjustment' && (
                  <Badge variant="danger">
                    <LocalizedText text={'Adjustments Pending'} />
                  </Badge>
                )}
              </div>
            </div>
            <Table>
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={'\n                    Item ID\n                  '}
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Qty Recv\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={'\n                    Status\n                  '}
                    />
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Quarantine\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Unit Cost (ETB)\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Line Value (ETB)\n                  '
                      }
                    />
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
                          <LocalizedText
                            text={
                              '\n                          Accepted\n                        '
                            }
                          />
                        </span>
                      ) : item.inspectionResult === 'rejected' ? (
                        <span className="inline-flex items-center text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          <LocalizedText
                            text={
                              '\n                          Rejected\n                        '
                            }
                          />
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          <LocalizedText text={'Accepted with Conditions'} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.quarantineFlag ? (
                        <Badge
                          variant="warning"
                          className="text-[10px] uppercase"
                        >
                          <LocalizedText
                            text={
                              '\n                          Quarantined\n                        '
                            }
                          />
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">
                      {parseFloat(item.perUnitLandedCostEtb).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 4, maximumFractionDigits: 4 },
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                      {formatAmount4(item.lineValueEtb)}
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
