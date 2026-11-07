import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Table,
  Modal,
  Input,
  PermissionGate,
} from '@/components/ui';
import {
  useVariances,
  useApproveVariance,
  useRejectVariance,
  useEvaluateShipmentVariances,
} from '../api';
import { useShipments } from '@/features/import-shipments/api';
import { formatAmount4 } from '@/lib/money';

export function VarianceQueuePage() {
  const localize = useUiText();
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const {
    data: variancesResponse,
    isLoading,
    isError,
    refetch,
  } = useVariances({
    status: statusFilter || undefined,
    shipmentId: selectedShipmentId || undefined,
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
  const evaluateMutation = useEvaluateShipmentVariances();

  const [selectedVariance, setSelectedVariance] = useState<any>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(
    null,
  );
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState('');
  const [evaluateError, setEvaluateError] = useState('');

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

  const formatAmount = (value: unknown) => {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? amount.toLocaleString(undefined, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })
      : '-';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_approval: 'Pending approval',
      approved: 'Approved',
      auto_approved: 'Auto-approved',
      rejected: 'Rejected',
    };
    return localize(labels[status] || status.replaceAll('_', ' '));
  };

  const getStatusVariant = (status: string) => {
    if (status === 'approved' || status === 'auto_approved') return 'success';
    if (status === 'rejected') return 'danger';
    return 'warning';
  };

  const openModal = (variance: any, action: 'approve' | 'reject') => {
    setSelectedVariance(variance);
    setModalAction(action);
    setComment('');
    setActionError('');
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariance || !modalAction) return;
    setActionError('');

    try {
      if (modalAction === 'approve') {
        await approveMutation.mutateAsync({ id: selectedVariance.id, comment });
      } else {
        await rejectMutation.mutateAsync({ id: selectedVariance.id, comment });
      }
      setModalAction(null);
      setSelectedVariance(null);
    } catch (error: any) {
      setActionError(
        error.response?.data?.message || `Failed to ${modalAction} variance`,
      );
    }
  };

  const handleEvaluate = async () => {
    if (!selectedShipmentId) return;
    setEvaluateError('');
    try {
      await evaluateMutation.mutateAsync(selectedShipmentId);
    } catch (error: any) {
      setEvaluateError(
        error.response?.data?.message ||
          'Could not evaluate variances. Confirm the shipment has a commercial invoice.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={localize('Cost Variances Approval Queue')}
        description={localize(
          'Review and action significant deviations between estimated and actual logistics costs. Requires Finance Manager authorization (AC08).',
        )}
      />

      <Card className="p-0 bg-white border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex flex-wrap justify-between items-center gap-3">
          <h3 className="font-bold text-gray-800">
            <LocalizedText
              text={statusFilter ? 'Variance Records' : 'All Variance Records'}
            />
          </h3>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <select
              aria-label={localize('Variance status filter')}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-800"
            >
              <option value="pending_approval">
                {localize('Pending approval')}
              </option>
              <option value="approved">{localize('Approved')}</option>
              <option value="auto_approved">{localize('Auto-approved')}</option>
              <option value="rejected">{localize('Rejected')}</option>
              <option value="">{localize('All statuses')}</option>
            </select>
            <Badge
              variant={statusFilter === 'pending_approval' ? 'warning' : 'info'}
            >
              {variances.length}{' '}
              <LocalizedText
                text={
                  statusFilter === 'pending_approval'
                    ? 'Requires Attention'
                    : 'Records'
                }
              />
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b px-4 py-3">
          <label className="min-w-64 flex-1 text-sm font-medium text-gray-700">
            <LocalizedText text={'Filter by shipment / Evaluate'} />
            <select
              aria-label={localize('Filter by shipment / Evaluate')}
              value={selectedShipmentId}
              onChange={(event) => setSelectedShipmentId(event.target.value)}
              className="mt-1 block h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="">{localize('All shipments')}</option>
              {shipments.map((shipment: any) => (
                <option key={shipment.id} value={shipment.id}>
                  {shipment.shipmentNumber}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col items-start gap-1">
            <Button
              variant="outline"
              onClick={handleEvaluate}
              disabled={!selectedShipmentId || evaluateMutation.isPending}
              isLoading={evaluateMutation.isPending}
            >
              <LocalizedText text={'Evaluate Variances'} />
            </Button>
            {evaluateError && (
              <p
                role="alert"
                className="text-xs text-red-600 font-medium max-w-xs"
              >
                {evaluateError}
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <LocalizedText
              text={'\n            Loading variances...\n          '}
            />
          </div>
        ) : isError ? (
          <div className="p-8 text-center" role="alert">
            <p className="text-sm text-red-700">
              {localize('Failed to load variances. Please try again.')}
            </p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => refetch()}
            >
              {localize('Retry')}
            </Button>
          </div>
        ) : variances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {localize(
              statusFilter === 'pending_approval'
                ? 'No pending variances to approve.'
                : 'No variances match the selected filters.',
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Shipment\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Cost Element\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Estimated (ETB)\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Actual (ETB)\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Variance (ETB)\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={
                        '\n                    Variance %\n                  '
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    {localize('Status')}
                  </th>
                  <th className="w-52 px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                    <LocalizedText
                      text={'\n                    Action\n                  '}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variances.map((v: any) => {
                  const pct = Number(v.variancePct);
                  const safePct = Number.isFinite(pct) ? pct : 0;
                  const isSevere = Math.abs(pct) > 10;

                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {getShipmentNumber(v.shipmentId)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 uppercase">
                        {String(v.varianceType || '').replaceAll('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {formatAmount(v.estimatedEtb)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                        {formatAmount(v.actualEtb)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                        {formatAmount(v.varianceEtb)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getSeverityColor(safePct)}`}
                        >
                          <LocalizedText text={safePct > 0 ? '+' : ''} />
                          {safePct.toFixed(2)}%
                        </span>
                        {isSevere && (
                          <span
                            className="text-red-500 ml-1 font-bold"
                            title={localize('Critical Severity')}
                          >
                            &#9888;
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(v.status)}>
                          {getStatusLabel(v.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {v.status === 'pending_approval' ? (
                          <PermissionGate permission="variance:approve">
                            <div className="flex flex-wrap justify-center gap-2">
                              <Button
                                className="min-w-24"
                                variant="success"
                                onClick={() => openModal(v, 'approve')}
                              >
                                {localize('Approve')}
                              </Button>
                              <Button
                                className="min-w-24"
                                variant="danger"
                                onClick={() => openModal(v, 'reject')}
                              >
                                {localize('Reject')}
                              </Button>
                            </div>
                          </PermissionGate>
                        ) : (
                          <span className="block text-center text-sm text-gray-400">
                            -
                          </span>
                        )}
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
            <strong>
              <LocalizedText text={'Shipment:'} />
            </strong>
            <LocalizedText text={' '} />
            {selectedVariance
              ? getShipmentNumber(selectedVariance.shipmentId)
              : ''}
            <br />
            <strong>
              <LocalizedText text={'Type:'} />
            </strong>{' '}
            {selectedVariance?.varianceType}
            <br />
            <strong>
              <LocalizedText text={'Deviation:'} />
            </strong>
            <LocalizedText text={' '} />
            {selectedVariance
              ? parseFloat(selectedVariance.variancePct).toFixed(2)
              : 0}
            % (
            {selectedVariance
              ? formatAmount4(selectedVariance.varianceEtb)
              : 0}
            <LocalizedText text={' '} />
            <LocalizedText text={'\n            ETB)\n          '} />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800 font-medium">
            <span className="font-bold text-lg">&#9888;</span>
            <LocalizedText
              text={
                modalAction === 'approve'
                  ? ' Approving this variance allows Landed Cost computation to proceed utilizing the actual entered costs.'
                  : ' Rejecting this variance blocks Landed Cost finalization until the actual cost entry is corrected.'
              }
            />
          </div>
          <Input
            label={localize('Authorization Comment (AC08) *')}
            placeholder={localize('Provide justification...')}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (actionError) setActionError('');
            }}
            required
          />
          {actionError && (
            <p role="alert" className="text-sm text-red-600 font-medium">
              {actionError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              variant="secondary"
              onClick={() => setModalAction(null)}
              type="button"
            >
              <LocalizedText text={'\n              Cancel\n            '} />
            </Button>
            <Button
              variant={modalAction === 'approve' ? 'success' : 'danger'}
              type="submit"
              isLoading={approveMutation.isPending || rejectMutation.isPending}
            >
              <LocalizedText text={'\n              Confirm '} />
              <LocalizedText
                text={modalAction === 'approve' ? 'Approval' : 'Rejection'}
              />
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
