import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface LandedCostResult {
  id: string;
  shipmentId: string;
  itemId: string;
  poLineId: string;
  shipmentItemId: string;
  quantityReceived: string;
  ciValueEtb: string;
  customsDutyEtb: string;
  importVatEtb: string;
  freightAllocatedEtb: string;
  insuranceAllocatedEtb: string;
  bankChargesAllocatedEtb: string;
  portChargesAllocatedEtb: string;
  clearingFeeAllocatedEtb: string;
  otherChargesAllocatedEtb: string;
  totalLandedCostEtb: string;
  perUnitLandedCostEtb: string;
  isEstimated: boolean;
  isFinalised: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useComputeLandedCost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      api
        .post(`/import-shipments/${shipmentId}/landed-cost/compute`)
        .then((res) => res.data),
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['landed-cost', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['shipments', shipmentId] });
    },
  });
};

export const useLandedCostResults = (shipmentId: string) => {
  return useQuery<LandedCostResult[]>({
    queryKey: ['landed-cost', shipmentId],
    queryFn: () =>
      api
        .get(`/import-shipments/${shipmentId}/landed-cost`)
        .then((res) => res.data),
    enabled: !!shipmentId,
  });
};

export const useFinalisationCheck = (shipmentId: string) => {
  return useQuery({
    queryKey: ['finalisation-check', shipmentId],
    queryFn: () =>
      api
        .get(`/import-shipments/${shipmentId}/finalisation-check`)
        .then((res) => res.data),
    enabled: !!shipmentId,
  });
};

export const useAcceptEstimates = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      justification,
    }: {
      id: string;
      justification: string;
    }) =>
      api
        .post(`/import-shipments/${id}/accept-estimates`, { justification })
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['finalisation-check', variables.id],
      });
    },
  });
};

export const useFinaliseShipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      api
        .post(`/import-shipments/${shipmentId}/finalise`)
        .then((res) => res.data),
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({
        queryKey: ['finalisation-check', shipmentId],
      });
      queryClient.invalidateQueries({ queryKey: ['landed-cost', shipmentId] });
      queryClient.invalidateQueries({
        queryKey: ['shipment-cost-entries', shipmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shipment-cost-summary', shipmentId],
      });
    },
  });
};

export const useLineage = (poLineId: string | undefined) => {
  return useQuery({
    queryKey: ['lineage', poLineId],
    queryFn: () =>
      api.get(`/lineage?po_line_id=${poLineId}`).then((res) => res.data),
    enabled: !!poLineId,
  });
};
