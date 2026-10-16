import React, { useState } from 'react';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Table,
  Modal,
  Input,
} from '@/components/ui';
import { useVariances, useApproveVariance, useRejectVariance } from '../api';
import { useShipments } from '@/features/import-shipments/api';

export function VarianceQueuePage() {
  const { data: variancesResponse, isLoading } = useVariances({
    status: 'pending_approval',
  });
  const variances = Array.isArray(variancesResponse)
    ? variancesResponse
    : variancesResponse?.data || [];

  const { data: shipmentsResponse } = useShipments();
  const shipments = Array.isArray(shipmentsResponse)
    ? shipmentsResponse
    : shipmentsResponse?.data || [];

  const approveMutation = useApproveVariance();
  const rejectMutation = useRejectVariance();

  const [selectedVariance, setSelectedVariance] = useState<any>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(
    null,
  );
  const [comment, setComment] = useState('');

  const getShipmentNumber = (id: string) => {
    const s = shipments.find((x: any) => x.id === id);
    return s ? s.shipmentNumber : id.slice(0, 8);
  };

  const getSeverityColor = (pct: number) => {
    const abs = Math.abs(pct);
    if (abs > 10) return 'text-red-600 bg-red-100';
    if (abs >= 5) return 'text-yellow-700 bg-yellow-100';
    return 'text-green-700 bg-green-100';
  };

  const openModal = (variance: any, action: 'approve' | 'reject') => {
    setSelectedVariance(variance);
    setModalAction(action);
    setComment('');
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariance || !modalAction) return;

    try {
      if (modalAction === 'approve') {
        await approveMutation.mutateAsync({ id: selectedVariance.id, comment });
      } else {
        await rejectMutation.mutateAsync({ id: selectedVariance.id, comment });
      }
      setModalAction(null);
      setSelectedVariance(null);
    } catch (error: any) {
      alert(
        error.response?.data?.message || `Failed to ${modalAction} variance`,
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Variances Approval Queue"
        description="Review and action significant deviations between estimated and actual logistics costs. Requires Finance Manager authorization (AC08)."
      />

      <Card className="p-0 bg-white border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Pending Variances</h3>
          <Badge variant="warning">{variances.length} Requires Attention</Badge>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading variances...
          </div>
        ) : variances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No pending variances to approve.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Shipment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Cost Element
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Estimated (ETB)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Actual (ETB)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Variance (ETB)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Variance %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variances.map((v: any) => {
                  const pct = parseFloat(v.variancePct);
                  const isSevere = Math.abs(pct) > 10;

                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {getShipmentNumber(v.shipmentId)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 uppercase">
                        {v.varianceType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {parseFloat(v.estimatedEtb).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                        {parseFloat(v.actualEtb).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                        {parseFloat(v.varianceEtb).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getSeverityColor(pct)}`}
                        >
                          {pct > 0 ? '+' : ''}
                          {pct.toFixed(2)}%
                        </span>
                        {isSevere && (
                          <span
                            className="text-red-500 ml-1 font-bold"
                            title="Critical Severity"
                          >
                            &#9888;
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          variant="success"
                          onClick={() => openModal(v, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => openModal(v, 'reject')}
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        title={
          modalAction === 'approve' ? 'Approve Variance' : 'Reject Variance'
        }
      >
        <form onSubmit={handleAction} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md border text-sm text-gray-700">
            <strong>Shipment:</strong>{' '}
            {selectedVariance
              ? getShipmentNumber(selectedVariance.shipmentId)
              : ''}
            <br />
            <strong>Type:</strong> {selectedVariance?.varianceType}
            <br />
            <strong>Deviation:</strong>{' '}
            {selectedVariance
              ? parseFloat(selectedVariance.variancePct).toFixed(2)
              : 0}
            % (
            {selectedVariance
              ? parseFloat(selectedVariance.varianceEtb).toLocaleString()
              : 0}{' '}
            ETB)
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800 font-medium">
            <span className="font-bold text-lg">&#9888;</span>
            {modalAction === 'approve'
              ? ' Approving this variance allows Landed Cost computation to proceed utilizing the actual entered costs.'
              : ' Rejecting this variance blocks Landed Cost finalization until the actual cost entry is corrected.'}
          </div>
          <Input
            label="Authorization Comment (AC08) *"
            placeholder="Provide justification..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              variant="secondary"
              onClick={() => setModalAction(null)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant={modalAction === 'approve' ? 'success' : 'danger'}
              type="submit"
              isLoading={approveMutation.isPending || rejectMutation.isPending}
            >
              Confirm {modalAction === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
