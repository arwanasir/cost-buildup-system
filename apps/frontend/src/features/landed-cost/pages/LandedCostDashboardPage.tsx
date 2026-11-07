import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState, useMemo } from 'react';
import { PageHeader, Badge, Select, Card, Button } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { useShipments } from '@/features/import-shipments/api';
import { useLandedCostResults, useComputeLandedCost } from '../api';
import { CompositionPieChart } from '../components/CompositionPieChart';
import { StackedBarChart } from '../components/StackedBarChart';
import { LandedCostResultsTable } from '../components/LandedCostResultsTable';
import { FinalisationPanel } from '../components/FinalisationPanel';

export function LandedCostDashboardPage() {
  const localize = useUiText();
  const { data: shipmentsResponse, isLoading: loadingShipments } =
    useShipments();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');

  // FIX: Replaced browser-native alert() with a state-driven <Toast> component.
  // alert() is a blocking synchronous call that:
  //  - Cannot be styled, localized, or made bilingual
  //  - Blocks the main thread and cannot be closed programmatically
  //  - Violates the project's UI/UX consistency requirements
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const shipments = Array.isArray(shipmentsResponse)
    ? shipmentsResponse
    : (shipmentsResponse as any)?.data || [];

  const { data: results, isLoading: loadingResults } =
    useLandedCostResults(selectedShipmentId);
  const computeMutation = useComputeLandedCost();

  const selectedShipment = shipments.find(
    (s: any) => s.id === selectedShipmentId,
  );

  const hasResults = results && results.length > 0;

  const summary = useMemo(() => {
    if (!hasResults) return null;
    let totalLanded = 0;
    let totalCi = 0;

    results.forEach((r) => {
      totalLanded += parseFloat(r.totalLandedCostEtb);
      totalCi += parseFloat(r.ciValueEtb);
    });

    const isFinalised = results[0].isFinalised;
    const isEstimated = results[0].isEstimated;
    const computedAt = results[0].computedAt;

    return {
      totalLanded,
      totalCi,
      itemsCount: results.length,
      isFinalised,
      isEstimated,
      computedAt,
    };
  }, [results, hasResults]);

  const computedAt = summary?.computedAt
    ? new Date(summary.computedAt)
    : null;
  const hasValidComputedAt = computedAt && !Number.isNaN(computedAt.getTime());

  const handleCompute = async () => {
    if (!selectedShipmentId) return;
    try {
      await computeMutation.mutateAsync(selectedShipmentId);
    } catch (e) {
      // FIX: replaced alert() with a non-blocking Toast notification
      setToast({
        message:
          'Failed to compute landed cost. Ensure allocation is completed first.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={localize('Landed Cost Dashboard')}
        description={localize(
          'Visualize final per-item mathematical breakdown and finalize shipments.',
        )}
      />

      {/* Non-blocking Toast notification (replaces alert()) */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}

      {/* Shipment Selector */}
      <Card className="p-4 bg-white shadow-sm border">
        <div className="max-w-md flex gap-4 items-end">
          <div className="flex-1">
            <Select
              label={localize('Select Shipment')}
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              options={[
                { label: '-- Select a Shipment --', value: '' },
                ...shipments.map((s: any) => ({
                  label: `${s.shipmentNumber} (PO: ${s.po?.poNumber || 'N/A'}) - ${s.status}`,
                  value: s.id,
                })),
              ]}
            />
          </div>
          {selectedShipmentId && !selectedShipment?.isFinalised && (
              <Button
                variant="primary"
                onClick={handleCompute}
                isLoading={computeMutation.isPending}
              >
                <LocalizedText
                  text={hasResults ? 'Recompute Draft LC' : 'Compute Draft LC'}
                />
              </Button>
          )}
        </div>
      </Card>

      {/* Dashboard Body */}
      {selectedShipmentId && hasResults && summary && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-blue-50 border-blue-100 flex flex-col justify-center">
              <div className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-1">
                <LocalizedText text={'Total Landed Cost'} />
              </div>
              <div className="text-2xl font-black text-blue-900">
                <LocalizedText text={'ETB'} />
                <LocalizedText text={' '} />
                {summary.totalLanded.toLocaleString(undefined, {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                <LocalizedText text={'CI Base: ETB'} />
                <LocalizedText text={' '} />
                {summary.totalCi.toLocaleString(undefined, {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </div>
            </Card>
            <Card className="p-4 bg-white border flex flex-col justify-center">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                <LocalizedText text={'Items Processed'} />
              </div>
              <div className="text-2xl font-black text-gray-900">
                {summary.itemsCount}
              </div>
            </Card>
            <Card className="p-4 bg-white border flex flex-col justify-center">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                <LocalizedText text={'Last Computed'} />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {hasValidComputedAt
                  ? computedAt.toLocaleString()
                  : localize('Not recorded; recompute this draft to record it.')}
              </div>
            </Card>
            <Card className="p-4 bg-white border flex flex-col justify-center items-start">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">
                <LocalizedText text={'Status'} />
              </div>
              {summary.isFinalised ? (
                <Badge variant="success" className="text-lg py-1 px-3">
                  <LocalizedText text={'FINALIZED'} />
                </Badge>
              ) : summary.isEstimated ? (
                <Badge variant="warning" className="text-lg py-1 px-3">
                  <LocalizedText text={'ESTIMATED DRAFT'} />
                </Badge>
              ) : (
                <Badge variant="default" className="text-lg py-1 px-3">
                  <LocalizedText text={'ACTUAL DRAFT'} />
                </Badge>
              )}
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6 bg-white border shadow-sm h-full">
                <h3 className="text-lg font-bold text-gray-800 mb-6">
                  <LocalizedText
                    text={'Per-Item LC Composition (Stacked)'}
                  />
                </h3>
                <StackedBarChart data={results} />
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="p-6 bg-white border shadow-sm h-full flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-6">
                  <LocalizedText text={'Total Cost Composition'} />
                </h3>
                <div className="flex-1 flex items-center justify-center min-h-[300px]">
                  <CompositionPieChart data={results} />
                </div>
              </Card>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              <LocalizedText
                text={'Final Per-Item Buildup Register'}
              />
            </h3>
            <LandedCostResultsTable data={results} />
          </div>

          {!summary.isFinalised && (
            <FinalisationPanel shipmentId={selectedShipmentId} />
          )}
        </div>
      )}

      {selectedShipmentId && !hasResults && !computeMutation.isPending && (
        <div className="p-12 text-center bg-white border rounded-lg shadow-sm">
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            <LocalizedText text={'No Landed Cost Results'} />
          </h3>
          <p className="text-gray-500">
            <LocalizedText
              text={
                selectedShipment?.isFinalised
                  ? 'This shipment is finalized but no LC results were found.'
                  : 'Click "Compute Draft LC" above to run the landed cost mathematical engine.'
              }
            />
          </p>
        </div>
      )}
    </div>
  );
}
