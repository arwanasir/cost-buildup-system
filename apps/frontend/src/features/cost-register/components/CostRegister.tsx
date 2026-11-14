import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useShipmentCostEntries,
  useDeleteCostEntry,
  useShipmentCostSummary,
} from '../api';
import {
  ClearingAgentInvoiceForm,
  PortChargesForm,
  StorageChargesForm,
} from '@/features/import-shipments/components/cost-register/ChargeForms';
import { CostSummaryBar } from './CostSummaryBar';
import { CostEntriesTable } from './CostEntriesTable';
import { AddCostEntryForm } from './AddCostEntryForm';
import { MarkActualModal } from './MarkActualModal';
import { ReverseEntryModal } from './ReverseEntryModal';
import { AllocateButton } from './AllocateButton';
import { type CostEntry } from '../api';

export function CostRegister({
  shipmentId,
  isFinalised,
}: {
  shipmentId: string;
  isFinalised?: boolean;
}) {
  const { data: entries, isLoading: loadingEntries } =
    useShipmentCostEntries(shipmentId);
  const { data: summary, isLoading: loadingSummary } =
    useShipmentCostSummary(shipmentId);

  const deleteMutation = useDeleteCostEntry();

  // FIX: Replaced browser-native confirm() with the existing <ConfirmDialog>
  // component. confirm() is a blocking synchronous call that:
  //  - Cannot be styled, localized, or made bilingual
  //  - Is blocked by default in many embedded browser environments
  //  - Violates the project's UI/UX consistency requirements
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    await deleteMutation.mutateAsync(deleteTargetId);
    setDeleteTargetId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteTargetId(null);
  };

  const [activeForm, setActiveForm] = useState<
    'clearing' | 'port' | 'storage' | 'general' | null
  >(null);
  const [markActualEntry, setMarkActualEntry] = useState<CostEntry | null>(
    null,
  );
  const [reverseEntry, setReverseEntry] = useState<CostEntry | null>(null);

  if (loadingEntries || loadingSummary) {
    return (
      <div className="p-4">
        <LocalizedText text={'Loading Cost Register...'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          <LocalizedText text={'Cost Register'} />
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveForm('clearing')}>
            <LocalizedText text={'+ Clearing Invoice'} />
          </Button>
          <Button variant="outline" onClick={() => setActiveForm('port')}>
            <LocalizedText text={'+ Port Charges'} />
          </Button>
          <Button variant="outline" onClick={() => setActiveForm('storage')}>
            <LocalizedText text={'+ Storage Charges'} />
          </Button>
          <Button variant="outline" onClick={() => setActiveForm('general')}>
            <LocalizedText text={'+ Other Cost'} />
          </Button>
          <AllocateButton shipmentId={shipmentId} isFinalised={isFinalised} />
        </div>
      </div>

      {summary && <CostSummaryBar summary={summary} />}

      <div>
        <h3 className="text-lg font-semibold mb-4">
          <LocalizedText text={'Cost Entries Ledger'} />
        </h3>
        <CostEntriesTable
          entries={entries || []}
          onDelete={handleDeleteRequest}
          onMarkActual={setMarkActualEntry}
          onReverse={setReverseEntry}
          isFinalised={isFinalised}
        />
      </div>

      {/* Styled confirmation dialog replacing the browser native confirm() */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Cost Entry"
        message="Are you sure you want to delete this cost entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />

      <ClearingAgentInvoiceForm
        isOpen={activeForm === 'clearing'}
        onClose={() => setActiveForm(null)}
        shipmentId={shipmentId}
      />
      <PortChargesForm
        isOpen={activeForm === 'port'}
        onClose={() => setActiveForm(null)}
        shipmentId={shipmentId}
      />
      <StorageChargesForm
        isOpen={activeForm === 'storage'}
        onClose={() => setActiveForm(null)}
        shipmentId={shipmentId}
      />
      <AddCostEntryForm
        isOpen={activeForm === 'general'}
        onClose={() => setActiveForm(null)}
        shipmentId={shipmentId}
      />
      <MarkActualModal
        entry={markActualEntry}
        isOpen={!!markActualEntry}
        onClose={() => setMarkActualEntry(null)}
      />
      <ReverseEntryModal
        entry={reverseEntry}
        isOpen={!!reverseEntry}
        onClose={() => setReverseEntry(null)}
      />
    </div>
  );
}
