import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// --- Types ---

export interface CostEntry {
  id: string;
  shipmentId: string;
  costCategoryId: string;
  costSubcategory: string | null;
  providerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountForeign: string;
  currency: string;
  fxRate: string;
  amountEtb: string;
  isEstimated: boolean;
  status: 'draft' | 'actual' | 'reversed';
  source: 'manual' | 'system';
  allocationMethod: string;
  attachment: string | null;
  createdAt: string;
  updatedAt: string;
  // Related
  costCategory?: any;
}

export interface CostSummary {
  shipmentId: string;
  totalSupplierCostEtb: string;
  totalAdditionalChargesEtb: string;
  grandTotalEtb: string;
  chargesByCategory: {
    categoryId: string;
    categoryName: string;
    totalAmountEtb: string;
    estimatedAmountEtb: string;
    actualAmountEtb: string;
  }[];
  variance: {
    estimatedTotalEtb: string;
    actualTotalEtb: string;
    varianceAmountEtb: string;
    variancePercent: string;
  };
  itemPreviews: {
    shipmentItemId: string;
    itemId: string;
    ciValueEtb: string;
    allocatedDraftCostsEtb: string;
    totalItemLandedCostEtb: string;
    perUnitLandedCostEtb: string;
  }[];
}

export interface Allocation {
  id: string;
  costEntryId: string;
  shipmentItemId: string;
  allocatedAmountEtb: string;
  allocationMethod: string;
  allocationFactor: string;
}

// --- DTOs ---

export interface CreateCostEntryDto {
  shipmentId?: string;
  costCategoryId: string;
  costSubcategory?: string;
  providerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountForeign: number;
  amountEtb?: number;
  currency: string;
  fxRate: number;
  allocationMethod?: string;
  isEstimated: boolean;
  attachment?: string;
}

export type UpdateCostEntryDto = Partial<CreateCostEntryDto>;

export interface MarkActualCostEntryDto {
  amountForeign: number;
  fxRate: number;
  amountEtb?: number;
  invoiceDate?: string;
  invoiceNumber?: string;
}

export interface ReverseCostEntryDto {
  reason: string;
}

// --- Hooks for Shipment-level Operations ---

export const useCreateCostEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCostEntryDto }) =>
      api
        .post(`/import-shipments/${id}/cost-entries`, data)
        .then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['shipment-cost-entries', id],
      });
      queryClient.invalidateQueries({
        queryKey: ['shipment-cost-summary', id],
      });
      queryClient.invalidateQueries({ queryKey: ['shipments', id] });
    },
  });
};

export const useShipmentCostEntries = (
  shipmentId: string,
  isEstimated?: boolean,
) => {
  return useQuery({
    queryKey: ['shipment-cost-entries', shipmentId, isEstimated],
    queryFn: () => {
      const params =
        isEstimated !== undefined ? { is_estimated: isEstimated } : undefined;
      return api
        .get<CostEntry[]>(`/import-shipments/${shipmentId}/cost-entries`, {
          params,
        })
        .then((res) => res.data);
    },
    enabled: !!shipmentId,
  });
};

export const useShipmentCostSummary = (shipmentId: string) => {
  return useQuery({
    queryKey: ['shipment-cost-summary', shipmentId],
    queryFn: () =>
      api
        .get<CostSummary>(`/import-shipments/${shipmentId}/cost-summary`)
        .then((res) => res.data),
    enabled: !!shipmentId,
  });
};

export const useShipmentAllocations = (shipmentId: string) => {
  return useQuery({
    queryKey: ['shipment-allocations', shipmentId],
    queryFn: () =>
      api
        .get<any[]>(`/import-shipments/${shipmentId}/allocations`)
        .then((res) => res.data),
    enabled: !!shipmentId,
  });
};

export const useAllocateShipmentCosts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      api
        .post(`/import-shipments/${shipmentId}/allocate`)
        .then((res) => res.data),
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({
        queryKey: ['shipment-allocations', shipmentId],
      });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

// --- Hooks for Entry-level Operations (CostEntries Controller) ---

export const useUpdateCostEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCostEntryDto }) =>
      api.patch(`/cost-entries/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-entries'] });
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-summary'] });
    },
  });
};

export const useMarkCostEntryActual = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MarkActualCostEntryDto }) =>
      api.post(`/cost-entries/${id}/mark-actual`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-entries'] });
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-summary'] });
    },
  });
};

export const useReverseCostEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReverseCostEntryDto }) =>
      api.post(`/cost-entries/${id}/reverse`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-entries'] });
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-summary'] });
    },
  });
};

export const useDeleteCostEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/cost-entries/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-entries'] });
      queryClient.invalidateQueries({ queryKey: ['shipment-cost-summary'] });
    },
  });
};

export const useCostEntryAttachment = (id: string) => {
  return useQuery({
    queryKey: ['cost-entry-attachment', id],
    queryFn: () =>
      api
        .get<{ url: string }>(`/cost-entries/${id}/attachment`)
        .then((res) => res.data),
    enabled: !!id,
  });
};
