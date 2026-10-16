import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useCustomsDeclaration,
  useOverrideItemRate,
  useAssessDeclaration,
  useReleaseDeclaration,
  useRecordPayment,
} from '../api';
import {
  Badge,
  Button,
  Modal,
  Input,
  PermissionGate,
  Skeleton,
  DualAmount,
} from '@/components/ui';

export function CustomsDeclarationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: declaration, isLoading } = useCustomsDeclaration(id!);

  const overrideMutation = useOverrideItemRate();
  const assessMutation = useAssessDeclaration();
  const releaseMutation = useReleaseDeclaration();
  const paymentMutation = useRecordPayment();

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dutyRateOverride, setDutyRateOverride] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [assessConfirmOpen, setAssessConfirmOpen] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [amountPaidEtb, setAmountPaidEtb] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseDate, setReleaseDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [releaseReference, setReleaseReference] = useState('');

  if (isLoading)
    return (
      <div className="p-8">
        <Skeleton className="h-96" />
      </div>
    );
  if (!declaration)
    return <div className="p-8 text-red-500">Declaration not found</div>;

  const handleOverrideSubmit = async (reason: string, newRate: string) => {
    if (!selectedItemId) return;
    try {
      await overrideMutation.mutateAsync({
        id: declaration.id,
        itemId: selectedItemId,
        data: {
          isRateOverridden: true,
          overrideReason: reason,
          dutyRate: newRate ? parseFloat(newRate) : undefined,
        },
      });
      setOverrideModalOpen(false);
      setSelectedItemId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssessSubmit = async () => {
    try {
      await assessMutation.mutateAsync(declaration.id);
      setAssessConfirmOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaymentSubmit = async (data: any) => {
    try {
      await paymentMutation.mutateAsync({
        id: declaration.id,
        data,
      });
      setPaymentModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReleaseSubmit = async (data: any) => {
    try {
      await releaseMutation.mutateAsync({
        id: declaration.id,
        data,
      });
      setReleaseModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const currency = declaration.shipment?.po?.currency || 'USD';
  const fxRate = declaration.shipment?.po?.fxRate || '1';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8">
      {/* Header section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Declaration {declaration.declarationNumber}
              <Badge
                variant={
                  declaration.status === 'released'
                    ? 'success'
                    : declaration.status === 'paid'
                      ? 'primary'
                      : declaration.status === 'assessed'
                        ? 'warning'
                        : 'secondary'
                }
              >
                {declaration.status.toUpperCase()}
              </Badge>
            </h1>
            <p className="text-gray-500 mt-1">
              Date: {declaration.declarationDate} | Agent:{' '}
              {declaration.clearingAgent || 'N/A'}
            </p>
          </div>
          <div className="flex gap-2">
            {declaration.status === 'draft' && (
              <PermissionGate permission="customs:write">
                <Button
                  variant="primary"
                  onClick={() => setAssessConfirmOpen(true)}
                  isLoading={assessMutation.isPending}
                >
                  Assess Duty
                </Button>
              </PermissionGate>
            )}
            {declaration.status === 'assessed' && (
              <PermissionGate permission="customs:write">
                <Button
                  variant="primary"
                  onClick={() => setPaymentModalOpen(true)}
                >
                  Record Payment
                </Button>
              </PermissionGate>
            )}
            {declaration.status === 'paid' && (
              <PermissionGate permission="customs:write">
                <Button
                  variant="success"
                  onClick={() => setReleaseModalOpen(true)}
                >
                  Release Shipment
                </Button>
              </PermissionGate>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          <div>
            <p className="text-sm font-medium text-gray-500">Total CIF Value</p>
            <p className="mt-1 text-lg font-semibold">
              {parseFloat(declaration.cifValueEtb).toLocaleString()} ETB
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Duty</p>
            <p className="mt-1 text-lg font-semibold">
              {parseFloat(declaration.totalDutyEtb).toLocaleString()} ETB
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              Total Taxes (VAT + Exc)
            </p>
            <p className="mt-1 text-lg font-semibold">
              {(
                parseFloat(declaration.totalVatEtb) +
                parseFloat(declaration.totalExciseEtb)
              ).toLocaleString()}{' '}
              ETB
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm font-bold text-blue-800">Total Assessment</p>
            <p className="mt-1 text-xl font-bold text-blue-900">
              {parseFloat(declaration.totalAssessmentEtb).toLocaleString()} ETB
            </p>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Declaration Items
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item / HS Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CIF Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duty Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duty (ETB)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VAT / Exc / WHT (ETB)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {declaration.items?.map((item) => {
                const poItem = item.shipmentItem?.poLine?.item;
                const shippedQty = item.shipmentItem?.shippedQuantity || 0;
                const unitPriceForeign =
                  item.shipmentItem?.ciUnitPrice ||
                  item.shipmentItem?.poLine?.unitPrice ||
                  0;
                const totalForeign =
                  parseFloat(unitPriceForeign) * parseFloat(shippedQty);

                return (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">
                        {poItem?.name || 'Unknown'}
                      </div>
                      <div className="text-gray-500 font-mono text-xs">
                        {item.hsCode}
                      </div>
                      {item.isRateOverridden && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          Manual Rate
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DualAmount
                        foreignAmount={totalForeign}
                        foreignCurrency={currency}
                        etbAmount={parseFloat(item.cifValueEtb)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.dutyStructure === 'ad_valorem'
                        ? `${parseFloat(item.dutyRate)}%`
                        : 'Specific'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {parseFloat(item.dutyEtb).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>V: {parseFloat(item.vatEtb).toLocaleString()}</div>
                      <div>
                        E: {parseFloat(item.exciseEtb).toLocaleString()}
                      </div>
                      <div>
                        W: {parseFloat(item.withholdingEtb).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {declaration.status === 'draft' && (
                        <button
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setOverrideModalOpen(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Override Rate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Override HS Duty Rate (BR07)"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Customs often disputes HS codes. Provide the official reason and the
            new overridden rate.
          </p>
          <Input
            label="New Duty Rate (%)"
            type="number"
            step="0.01"
            value={dutyRateOverride}
            onChange={(e) => setDutyRateOverride(e.target.value)}
          />
          <Input
            label="Override Reason"
            placeholder="e.g. Disputed at port, official decree #..."
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setOverrideModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleOverrideSubmit(overrideReason, dutyRateOverride)}
              isLoading={overrideMutation.isPending}
              disabled={!overrideReason}
            >
              Apply Override
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Duty Payment"
      >
        <div className="space-y-4">
          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <Input
            label="Amount Paid (ETB)"
            type="number"
            step="0.01"
            value={amountPaidEtb}
            onChange={(e) => setAmountPaidEtb(e.target.value)}
          />
          <Input
            label="Receipt Number / CPO"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                handlePaymentSubmit({
                  paymentDate,
                  amountPaidEtb: parseFloat(amountPaidEtb),
                  receiptNumber,
                })
              }
              isLoading={paymentMutation.isPending}
            >
              Save Payment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        title="Log Customs Release"
      >
        <div className="space-y-4">
          <Input
            label="Release Date"
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
          />
          <Input
            label="Release Reference / Document #"
            value={releaseReference}
            onChange={(e) => setReleaseReference(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setReleaseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                handleReleaseSubmit({
                  releaseDate,
                  releaseReference,
                })
              }
              isLoading={releaseMutation.isPending}
            >
              Confirm Release
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={assessConfirmOpen}
        onClose={() => setAssessConfirmOpen(false)}
        title="Confirm Duty Assessment"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to assess this declaration? This action will
            formally lock the duty calculations.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>System Note:</strong> Upon successful assessment, the
                  total duty, excise, VAT, and withholding entries will be
                  permanently written to the Cost Register (AC04).
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setAssessConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssessSubmit}
              isLoading={assessMutation.isPending}
            >
              Confirm Assessment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
