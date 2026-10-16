import React, { useState } from 'react';
import { Button } from '@/components/ui';
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

  const handleDelete = async (id: string) => {
    if (confirm('Delete this cost entry?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const [activeForm, setActiveForm] = useState<
    'clearing' | 'port' | 'storage' | 'general' | null
  >(null);
  const [markActualEntry, setMarkActualEntry] = useState<CostEntry | null>(
    null,
  );
  const [reverseEntry, setReverseEntry] = useState<CostEntry | null>(null);

  if (loadingEntries || loadingSummary) {
    return <div className="p-4">Loading Cost Register...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cost Register (AC04)</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveForm('clearing')}>
            + Clearing Invoice
          </Button>
          <Button variant="outline" onClick={() => setActiveForm('port')}>
            + Port Charges
          </Button>
          <Button variant="outline" onClick={() => setActiveForm('storage')}>
            + Storage Charges
          </Button>
          <Button variant="outline" onClick={() => setActiveForm('general')}>
            + Other Cost
          </Button>
          <AllocateButton shipmentId={shipmentId} isFinalised={isFinalised} />
        </div>
      </div>

      {summary && <CostSummaryBar summary={summary} />}

      <div>
        <h3 className="text-lg font-semibold mb-4">Cost Entries Ledger</h3>
        <CostEntriesTable
          entries={entries || []}
          onDelete={handleDelete}
          onMarkActual={setMarkActualEntry}
          onReverse={setReverseEntry}
          isFinalised={isFinalised}
        />
      </div>

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
