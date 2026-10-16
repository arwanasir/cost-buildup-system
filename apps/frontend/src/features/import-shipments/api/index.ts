import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// --- Types ---

export interface ShipmentItem {
  id: string;
  poLineId: string;
  itemId?: string;
  shippedQuantity: number | string;
  ciUnitPrice: number | string;
  weightKg?: number | string;
  volumeCbm?: number | string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  poId: string;
  lcId: string;
  supplierId: string;
  status:
    | 'ordered'
    | 'shipped'
    | 'at_customs'
    | 'cleared'
    | 'partially_received'
    | 'received';
  vesselName?: string;
  blNumber?: string;
  blDate?: string;
  portOfLoading?: string;
  portOfDestination?: string;
  incoterm?: string;
  carrier?: string;
  containerNumbers?: string[];
  eta?: string;
  totalWeightKg?: string;
  totalVolumeCbm?: string;
  items: ShipmentItem[];
  commercialInvoice?: CommercialInvoice;
  commercialInvoices?: CommercialInvoice[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateShipmentDto {
  poId: string;
  vesselName?: string;
  blNumber?: string;
  blDate?: string;
  portOfLoading?: string;
  portOfDestination?: string;
  incoterm?: string;
  carrier?: string;
  containerNumbers?: string[];
  eta?: string;
  totalWeightKg?: number;
  totalVolumeCbm?: number;
  allowOverShipment?: boolean;
  items: {
    poLineId: string;
    shippedQuantity: number;
    ciUnitPrice: number;
    weightKg?: number;
    volumeCbm?: number;
  }[];
}

export interface CommercialInvoice {
  id: string;
  shipmentId: string;
  ciNumber: string;
  ciDate: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  currency?: string;
  fxRate?: string;
  totalForeign?: string;
  totalEtb?: string;
  totalAmountForeign: string;
  priceVariancePct?: string;
  acknowledgedAt?: string;
  varianceAmount?: string;
  varianceReason?: string;
  varianceAcknowledgedBy?: string;
  varianceAcknowledgedAt?: string;
  createdAt: string;
}

export interface CreateCommercialInvoiceDto {
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  fxRate: number;
  items: {
    shipmentItemId: string;
    ciUnitPrice: number;
  }[];
}

export interface ShipmentDocument {
  id: string;
  shipmentId: string;
  documentType: string;
  documentRef?: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

// --- Shipments Hooks ---

export const useShipments = (filters?: {
  status?: string;
  poId?: string;
  supplierId?: string;
  etaStart?: string;
  etaEnd?: string;
}) => {
  return useQuery({
    queryKey: ['shipments', filters],
    queryFn: () =>
      api.get<Shipment[]>('/import-shipments', { params: filters }),
  });
};

export const useShipment = (id: string) => {
  return useQuery({
    queryKey: ['shipments', id],
    queryFn: () => api.get<Shipment>(`/import-shipments/${id}`),
    enabled: !!id,
  });
};

export const useCreateShipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShipmentDto) =>
      api.post<Shipment>('/import-shipments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

export const useUpdateShipmentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      actualArrivalDate,
    }: {
      id: string;
      status: Shipment['status'];
      actualArrivalDate?: string;
    }) =>
      api.post(`/import-shipments/${id}/status`, { status, actualArrivalDate }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments', id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

// --- Documents Hooks ---

export const useShipmentDocuments = (shipmentId: string) => {
  return useQuery({
    queryKey: ['shipments', shipmentId, 'documents'],
    queryFn: () =>
      api.get<ShipmentDocument[]>(`/import-shipments/${shipmentId}/documents`),
    enabled: !!shipmentId,
  });
};

export const useUploadShipmentDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shipmentId,
      file,
      documentType,
      documentRef,
    }: {
      shipmentId: string;
      file: File;
      documentType: string;
      documentRef?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (documentRef) formData.append('documentRef', documentRef);

      return api.post(`/import-shipments/${shipmentId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({
        queryKey: ['shipments', shipmentId, 'documents'],
      });
    },
  });
};

export const useDeleteShipmentDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shipmentId,
      docId,
    }: {
      shipmentId: string;
      docId: string;
    }) => api.delete(`/import-shipments/${shipmentId}/documents/${docId}`),
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({
        queryKey: ['shipments', shipmentId, 'documents'],
      });
    },
  });
};

export const useShipmentDocumentChecklist = (shipmentId: string) => {
  return useQuery({
    queryKey: ['shipments', shipmentId, 'document-checklist'],
    queryFn: () =>
      api.get<any>(`/import-shipments/${shipmentId}/document-checklist`),
    enabled: !!shipmentId,
  });
};

// --- Commercial Invoice Hooks ---

export const useCreateCommercialInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shipmentId,
      data,
    }: {
      shipmentId: string;
      data: CreateCommercialInvoiceDto;
    }) =>
      api.post<CommercialInvoice>(
        `/import-shipments/${shipmentId}/commercial-invoice`,
        data,
      ),
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

export const useAcknowledgeVariance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ciId }: { ciId: string }) =>
      api.post(`/import-shipments/${ciId}/acknowledge`, {}),
    onSuccess: () => {
      // It uses CI id, so we might just invalidate all shipments to be safe
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

export const useCreateCostEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api
        .post(`/import-shipments/${id}/cost-entries`, data)
        .then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['shipment-cost-entries', id],
      });
      queryClient.invalidateQueries({ queryKey: ['shipments', id] });
    },
  });
};
