import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Decimal from 'decimal.js';
import { format } from 'date-fns';
import {
  usePurchaseOrder,
  useApprovePo,
  useRejectPo,
  type PoStatus,
} from '../api';
import {
  Button,
  Skeleton,
  ErrorState,
  Badge,
  Table,
  DualAmount,
  Modal,
  Input,
  Toast,
  ConfirmDialog,
} from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { BackButton } from '@/components/ui/BackButton';
import { formatAmount4 } from '@/lib/money';

export function PurchaseOrderDetailPage() {
  const localize = useUiText();
  const { id } = useParams<{ id: string }>();
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isConfirmApproveOpen, setIsConfirmApproveOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const { data: po, isLoading, isError, refetch } = usePurchaseOrder(id!);
  const approveMutation = useApprovePo();
  const rejectMutation = useRejectPo();

  const currentUser = useAuthStore((state) => state.user);

  if (isLoading) return <Skeleton className="h-[800px] w-full" />;
  if (isError || !po)
    return (
      <ErrorState
        message={localize('Failed to load Purchase Order')}
        onRetry={() => refetch()}
      />
    );

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

  const handleApprove = () => {
    setIsConfirmApproveOpen(true);
  };

  const handleConfirmApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id: po.id });
      setIsConfirmApproveOpen(false);
      setActionFeedback({
        message: 'Purchase Order approved successfully',
        type: 'success',
      });
    } catch (error: any) {
      setIsConfirmApproveOpen(false);
      setActionFeedback({
        message:
          error.response?.data?.message ||
          error.message ||
          'Failed to approve Purchase Order',
        type: 'error',
      });
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: po.id, comment: rejectComment });
      setIsRejectModalOpen(false);
      setRejectComment('');
      setActionFeedback({
        message: 'Purchase Order rejected',
        type: 'success',
      });
    } catch (error: any) {
      setActionFeedback({
        message:
          error.response?.data?.message ||
          error.message ||
          'Failed to reject Purchase Order',
        type: 'error',
      });
    }
  };

  const pendingApprovalRecord = po.poApprovals?.find(
    (a) => a.decision === null,
  );
  const requiredRole = pendingApprovalRecord?.requiredRole;

  // A user can approve if the PO is pending_approval, and they hold the required role (or they are ADMIN_ALL).
  const canApprove =
    po.status === 'pending_approval' &&
    (currentUser?.role === requiredRole ||
      currentUser?.role === 'system_admin');

  const lineColumns = [
    { header: 'Item', accessor: (row: any) => row.item?.name || row.itemId },
    { header: 'Description', accessor: (row: any) => row.description || '-' },
    {
      header: 'Unit Price',
      accessor: (row: any) => `${formatAmount4(row.unitPrice)} ${po.currency}`,
    },
    {
      header: 'Ordered',
      accessor: (row: any) =>
        `${parseFloat(row.quantity)} ${row.unitOfMeasure}`,
    },
    {
      header: 'Shipped',
      accessor: (row: any) =>
        `${parseFloat(row.shippedQuantity || '0')} ${row.unitOfMeasure}`,
    },
    {
      header: 'Received',
      accessor: (row: any) =>
        `${parseFloat(row.receivedQuantity || '0')} ${row.unitOfMeasure}`,
    },
    {
      header: 'Outstanding',
      accessor: (row: any) => {
        const qty = new Decimal(row.quantity);
        const received = new Decimal(row.receivedQuantity || '0');
        const outstanding = qty.minus(received);
        return (
          <span
            className={
              outstanding.gt(0)
                ? 'text-amber-600 font-semibold'
                : 'text-green-600'
            }
          >
            {outstanding.toString()} {row.unitOfMeasure}
          </span>
        );
      },
    },
    {
      header: 'Line Total',
      accessor: (row: any) => (
        <span className="font-mono">
          {formatAmount4(row.totalLineValue || '0')} {po.currency}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <BackButton to="/purchase-orders" label="Back to purchase orders" />
      {actionFeedback && (
        <Toast
          message={actionFeedback.message}
          type={actionFeedback.type}
          onClose={() => setActionFeedback(null)}
        />
      )}
      {/* Header section */}
      <div className="sm:flex sm:items-center sm:justify-between bg-white p-6 shadow sm:rounded-lg border border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{po.poNumber}</h1>
            {getStatusBadge(po.status)}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            <LocalizedText text={'\n            Created on '} />
            {format(new Date(po.poDate), 'PPP')}{' '}
            <LocalizedText text={' • Supplier:'} />
            <LocalizedText text={' '} />
            <span className="font-medium text-gray-900">
              {po.supplier?.name || po.supplierId}
            </span>
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          {canApprove && (
            <>
              <Button
                variant="danger"
                onClick={() => setIsRejectModalOpen(true)}
                isLoading={rejectMutation.isPending}
              >
                <LocalizedText
                  text={'\n                Reject PO\n              '}
                />
              </Button>
              <Button
                variant="success"
                onClick={handleApprove}
                isLoading={approveMutation.isPending}
              >
                <LocalizedText
                  text={'\n                Approve PO\n              '}
                />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              <LocalizedText
                text={'\n              Financial Summary\n            '}
              />
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  <LocalizedText
                    text={
                      '\n                  Total Purchase Value (FOB)\n                '
                    }
                  />
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <DualAmount
                    amountForeign={po.totalValueForeign}
                    amountEtb={po.totalValueEtb}
                    currency={po.currency}
                  />
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  <LocalizedText
                    text={
                      '\n                  Estimated Duty Liability\n                '
                    }
                  />
                </dt>
                <dd className="mt-1 text-lg font-bold font-mono text-red-600">
                  {formatAmount4(po.estimatedDutyEtb || '0')}{' '}
                  <LocalizedText text={' ETB\n                '} />
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  <LocalizedText
                    text={
                      '\n                  Exchange Rate applied\n                '
                    }
                  />
                </dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {po.fxRate}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  <LocalizedText text={'Incoterm'} />
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{po.incoterm}</dd>
              </div>
            </dl>
          </div>

          {/* Lines Table */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                <LocalizedText
                  text={'\n                Line Items\n              '}
                />
              </h3>
            </div>
            <div className="p-4 overflow-x-auto">
              <Table columns={lineColumns} data={po.poLines || []} />
            </div>
          </div>
        </div>

        {/* Right Column: Workflow & Relations */}
        <div className="space-y-6">
          {/* Approval History */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              <LocalizedText
                text={'\n              Workflow History\n            '}
              />
            </h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {(po.poApprovals || []).map((approval, eventIdx, array) => (
                  <li key={approval.id}>
                    <div className="relative pb-8">
                      {eventIdx !== array.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              approval.decision === 'approved'
                                ? 'bg-green-500'
                                : approval.decision === 'rejected'
                                  ? 'bg-red-500'
                                  : 'bg-gray-300'
                            }`}
                          >
                            <svg
                              className="h-5 w-5 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              {approval.decision === 'approved' ? (
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              ) : approval.decision === 'rejected' ? (
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              ) : (
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                  clipRule="evenodd"
                                />
                              )}
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <LocalizedText
                                text={
                                  approval.decision === 'approved'
                                    ? 'Approved by '
                                    : approval.decision === 'rejected'
                                      ? 'Rejected by '
                                      : 'Pending approval from '
                                }
                              />
                              <span className="font-medium text-gray-900">
                                {approval.approver?.fullName ||
                                  approval.requiredRole}
                              </span>
                            </p>
                            {approval.comment && (
                              <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded italic">
                                "{approval.comment}"
                              </p>
                            )}
                          </div>
                          <div className="text-right text-xs whitespace-nowrap text-gray-500">
                            {approval.decidedAt
                              ? format(
                                  new Date(approval.decidedAt),
                                  'MMM d, h:mm a',
                                )
                              : 'Pending'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                {(!po.poApprovals || po.poApprovals.length === 0) && (
                  <p className="text-sm text-gray-500 italic">
                    <LocalizedText
                      text={
                        '\n                    No workflow history available.\n                  '
                      }
                    />
                  </p>
                )}
              </ul>
            </div>
          </div>

          {/* Relations */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              <LocalizedText
                text={'\n              Linked Documents\n            '}
              />
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  <LocalizedText
                    text={
                      '\n                  Letter of Credit\n                '
                    }
                  />
                </h4>
                {po.lettersOfCredit && po.lettersOfCredit.length > 0 ? (
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                    {po.lettersOfCredit.map((lc) => (
                      <li
                        key={lc.id}
                        className="p-3 text-sm flex justify-between items-center"
                      >
                        <Link
                          to={`/letters-of-credit/${lc.id}`}
                          className="font-mono text-blue-600 hover:underline"
                        >
                          {lc.lcNumber}
                        </Link>
                        <Badge>{lc.status}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    <LocalizedText
                      text={
                        '\n                    No Letter of Credit linked.\n                  '
                      }
                    />
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  <LocalizedText
                    text={'\n                  Shipments\n                '}
                  />
                </h4>
                {po.shipments && po.shipments.length > 0 ? (
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                    {po.shipments.map((sh) => (
                      <li
                        key={sh.id}
                        className="p-3 text-sm flex justify-between items-center"
                      >
                        <Link
                          to={`/shipments/${sh.id}`}
                          className="font-mono text-blue-600 hover:underline"
                        >
                          {sh.shipmentNumber}
                        </Link>
                        <Badge>{sh.status}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    <LocalizedText
                      text={
                        '\n                    No Shipments recorded yet.\n                  '
                      }
                    />
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title={localize('Reject Purchase Order')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <LocalizedText
              text={
                '\n            Please provide a reason for rejecting this purchase order. This\n            comment will be visible in the workflow history.\n          '
              }
            />
          </p>
          <Input
            label={localize('Rejection Reason *')}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder={localize(
              'e.g. Unit price exceeds budget allocation...',
            )}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsRejectModalOpen(false)}
            >
              <LocalizedText text={'\n              Cancel\n            '} />
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectComment.trim()}
              isLoading={rejectMutation.isPending}
            >
              <LocalizedText
                text={'\n              Submit Rejection\n            '}
              />
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmApproveOpen}
        title={localize('Approve Purchase Order')}
        message={localize(
          'Are you sure you want to approve this Purchase Order? This action will advance the PO workflow.',
        )}
        confirmText={localize('Approve')}
        isLoading={approveMutation.isPending}
        onConfirm={handleConfirmApprove}
        onClose={() => setIsConfirmApproveOpen(false)}
      />
    </div>
  );
}
