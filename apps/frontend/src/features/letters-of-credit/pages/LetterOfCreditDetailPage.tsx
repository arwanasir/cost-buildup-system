import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Modal,
  Badge,
  Skeleton,
  ErrorState,
  DualAmount,
  PermissionGate,
} from '@/components/ui';
import { BankChargesPanel } from '../components/BankChargesPanel';
import { RequiredDocumentsChecklist } from '../components/RequiredDocumentsChecklist';
import {
  useLetterOfCredit,
  useUpdateLcStatus,
  useGmApproveLc,
  useAmendLc,
  useMarkDocumentReceived,
  type LcStatus,
} from '../api';
import { useSettings } from '@/features/settings/api';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  applied: ['opened'],
  opened: ['advised', 'amended'],
  advised: ['docs_submitted', 'amended'],
  amended: ['advised', 'docs_submitted'],
  docs_submitted: ['docs_received'],
  docs_received: ['docs_checked'],
  docs_checked: ['accepted', 'discrepancies_found'],
  discrepancies_found: ['accepted', 'docs_checked'],
  accepted: ['payment_authorised'],
  payment_authorised: ['settled'],
  settled: [],
};

const STATUS_PIPELINE = [
  'applied',
  'opened',
  'advised',
  'amended',
  'docs_submitted',
  'docs_received',
  'docs_checked',
  'discrepancies_found',
  'accepted',
  'payment_authorised',
  'settled',
];

const amendSchema = z.object({
  amountDelta: z.number().optional(),
  newExpiryDate: z.string().optional(),
  newLastShipmentDate: z.string().optional(),
  description: z.string().min(1, 'Reason for amendment is required'),
  amendmentFeeEtb: z.number().positive('Fee must be positive').optional(),
});
type AmendFormData = z.infer<typeof amendSchema>;

export function LetterOfCreditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lcData, isLoading, isError, refetch } = useLetterOfCredit(id!);
  const { data: settingsData } = useSettings();

  const updateStatus = useUpdateLcStatus();
  const gmApprove = useGmApproveLc();
  const amendLc = useAmendLc();
  const markDoc = useMarkDocumentReceived();

  const [isAmendModalOpen, setAmendModalOpen] = useState(false);

  const amendForm = useForm<AmendFormData>({
    resolver: zodResolver(amendSchema),
  });

  const lc = lcData?.data;
  if (isLoading) return <Skeleton className="h-[800px] w-full" />;
  if (isError || !lc)
    return <ErrorState message="Failed to load LC" onRetry={() => refetch()} />;

  const settings = settingsData || [];
  const gmThresholdSetting = settings.find(
    (s: any) => s.key === 'lc_gm_threshold',
  );
  const gmThreshold = gmThresholdSetting
    ? parseFloat(gmThresholdSetting.valueNumeric!)
    : 10000000;
  const needsGmApproval = parseFloat(lc.amountEtb) > gmThreshold;
  const canAdvance =
    lc.status === 'applied' ? !needsGmApproval || !!lc.gmApprovedBy : true;

  const allowedNext = ALLOWED_TRANSITIONS[lc.status] || [];

  const handleAdvanceStatus = async (nextStatus: string) => {
    try {
      await updateStatus.mutateAsync({
        id: lc.id,
        status: nextStatus as LcStatus,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAmendSubmit = async (data: AmendFormData) => {
    try {
      await amendLc.mutateAsync({
        id: lc.id,
        data: {
          ...data,
          newExpiryDate: data.newExpiryDate
            ? new Date(data.newExpiryDate).toISOString()
            : undefined,
          newLastShipmentDate: data.newLastShipmentDate
            ? new Date(data.newLastShipmentDate).toISOString()
            : undefined,
        },
      });
      setAmendModalOpen(false);
      amendForm.reset();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDoc = async (docId: string, current: boolean) => {
    await markDoc.mutateAsync({ id: lc.id, docId, isReceived: !current });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center gap-4">
            {lc.lcNumber || 'DRAFT LC'}
            <Badge variant="info">
              {lc.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Issuing Bank:{' '}
            <span className="font-medium text-gray-900">{lc.issuingBank}</span>{' '}
            | Type:{' '}
            <span className="font-medium text-gray-900 uppercase">
              {lc.lcType}
            </span>
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 gap-3">
          {needsGmApproval && !lc.gmApprovedBy && lc.status === 'applied' && (
            <PermissionGate permission="lc:approve">
              <Button
                onClick={() => gmApprove.mutate(lc.id)}
                isLoading={gmApprove.isPending}
                variant="warning"
              >
                GM Approve
              </Button>
            </PermissionGate>
          )}

          {/* Advance Status Dropdown or Buttons */}
          {canAdvance &&
            allowedNext.map((next) =>
              next === 'amended' ? (
                <PermissionGate permission="lc:write" key={next}>
                  <Button
                    variant="secondary"
                    onClick={() => setAmendModalOpen(true)}
                  >
                    Amend LC
                  </Button>
                </PermissionGate>
              ) : (
                <PermissionGate permission="lc:write" key={next}>
                  <Button
                    variant="primary"
                    onClick={() => handleAdvanceStatus(next)}
                    isLoading={updateStatus.isPending}
                  >
                    Advance to {next.replace('_', ' ').toUpperCase()}
                  </Button>
                </PermissionGate>
              ),
            )}
        </div>
      </div>

      {/* 11-Step Timeline */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 overflow-x-auto">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Lifecycle Timeline
        </h3>
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {STATUS_PIPELINE.map((step, stepIdx) => {
              const isActive = lc.status === step;
              const isPast = STATUS_PIPELINE.indexOf(lc.status) > stepIdx;

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
        {/* Left Column: Financials & Dates */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6 flex justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Financial Value
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    LC Amount
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <DualAmount
                      amountForeign={lc.amountForeign}
                      amountEtb={lc.amountEtb}
                      currency={lc.currency}
                    />
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">FX Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">
                    {lc.fxRate}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Expiry Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(lc.expiryDate).toLocaleDateString()}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Last Shipment Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {lc.lastShipmentDate
                      ? new Date(lc.lastShipmentDate).toLocaleDateString()
                      : 'N/A'}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    GM Approval Status
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {needsGmApproval ? (
                      lc.gmApprovedBy ? (
                        <Badge variant="success">Approved</Badge>
                      ) : (
                        <Badge variant="warning">Pending Approval</Badge>
                      )
                    ) : (
                      <span className="text-gray-500">
                        Not Required (Below Threshold)
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Amendments Tracking
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5">
              {lc.amendments?.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No amendments have been made.
                </p>
              ) : (
                <ul className="space-y-4">
                  {lc.amendments?.map((amd) => (
                    <li
                      key={amd.id}
                      className="bg-gray-50 p-4 rounded border border-gray-200"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium text-sm text-gray-900">
                          {amd.description}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(amd.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 flex gap-4">
                        {amd.amountDelta && (
                          <span>
                            Amount Delta:{' '}
                            <span className="font-mono">
                              {parseFloat(amd.amountDelta).toLocaleString()}
                            </span>
                          </span>
                        )}
                        {amd.newExpiryDate && (
                          <span>
                            New Expiry:{' '}
                            {new Date(amd.newExpiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <BankChargesPanel lc={lc} />

        {/* Right Column: Documents */}
        <div className="space-y-6">
          <RequiredDocumentsChecklist lc={lc} />
        </div>
      </div>

      {/* Amend Modal */}
      <Modal
        isOpen={isAmendModalOpen}
        onClose={() => setAmendModalOpen(false)}
        title="Amend Letter of Credit"
      >
        <form
          onSubmit={amendForm.handleSubmit(handleAmendSubmit)}
          className="space-y-4 mt-4"
        >
          <Input
            label="Reason for Amendment *"
            {...amendForm.register('description')}
            error={amendForm.formState.errors.description?.message}
          />
          <Input
            label="Amount Delta (Foreign)"
            type="number"
            step="0.01"
            {...amendForm.register('amountDelta', { valueAsNumber: true })}
          />
          <Input
            label="Amendment Fee (ETB)"
            type="number"
            step="0.01"
            {...amendForm.register('amendmentFeeEtb', { valueAsNumber: true })}
          />
          <Input
            label="New Expiry Date"
            type="date"
            {...amendForm.register('newExpiryDate')}
          />
          <Input
            label="New Last Shipment Date"
            type="date"
            {...amendForm.register('newLastShipmentDate')}
          />

          <div className="mt-5 sm:mt-6 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAmendModalOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={amendLc.isPending}
            >
              Submit Amendment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
