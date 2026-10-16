import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export type PoStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'shipped'
  | 'partially_received'
  | 'closed';

export type Incoterm = 'FOB' | 'CIF' | 'EXW' | 'CFR' | 'CPT' | 'DAP';

export interface PurchaseOrderLine {
  id: string;
  poId: string;
  itemId: string;
  description: string | null;
  quantity: string;
  unitOfMeasure: string;
  unitPrice: string;
  totalPrice: string;
  hsCode: string | null;
  estimatedDutyRate: string | null;
  shippedQuantity?: string;
  receivedQuantity?: string;
  // Related
  item?: {
    itemCode: string;
    name: string;
  };
}

export interface PurchaseOrderApproval {
  id: string;
  poId: string;
  requiredRole: string;
  approverId: string | null;
  decision: 'approved' | 'rejected' | null;
  comment: string | null;
  decidedAt: string | null;
  createdAt: string;
  approver?: {
    id: string;
    fullName: string;
    role: string;
  };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  poDate: string;
  status: PoStatus;
  lcId: string | null;
  supplierId: string;
  incoterm: Incoterm;
  countryOfOrigin: string | null;
  estimatedShipmentDate: string | null;
  estimatedArrivalDate: string | null;
  currency: string;
  fxRate: string;
  portOfLoading: string | null;
  portOfDestination: string | null;

  totalAmount: string;
  totalAmountEtb: string;
  totalValueForeign?: string;
  totalValueEtb?: string;

  estimatedFreightEtb: string;
  estimatedInsuranceEtb: string;
  estimatedOtherChargesEtb: string;
  estimatedDutyEtb?: string;

  notes: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  supplier?: {
    id: string;
    name: string;
  };
  lines?: PurchaseOrderLine[];
  approvals?: PurchaseOrderApproval[];
  poLines?: PurchaseOrderLine[];
  poApprovals?: PurchaseOrderApproval[];
  lettersOfCredit?: any[];
  shipments?: any[];
}

export interface FetchPurchaseOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

export function normalizePurchaseOrder(value: any): PurchaseOrder {
  return {
    ...value,
    totalAmount: value.totalAmount ?? value.totalValueForeign,
    totalAmountEtb: value.totalAmountEtb ?? value.totalValueEtb,
    supplier: value.supplier ?? value.suppliers,
    lines: value.lines ?? value.poLines,
    approvals: value.approvals ?? value.poApprovals,
    poLines: value.poLines ?? value.lines,
    poApprovals: value.poApprovals ?? value.approvals,
    lettersOfCredit: value.lettersOfCredit ?? (value.lc ? [value.lc] : []),
  };
}

// ========================
// GET /purchase-orders
// ========================
export const usePurchaseOrders = (params: FetchPurchaseOrdersParams = {}) => {
  return useQuery<{ data: PurchaseOrder[]; total: number }>({
    queryKey: ['purchase-orders', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.page !== undefined)
        query.append('page', params.page.toString());
      if (params.limit !== undefined)
        query.append('limit', params.limit.toString());
      if (params.search) query.append('search', params.search);
      if (params.status) query.append('status', params.status);
      if (params.supplierId) query.append('supplierId', params.supplierId);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);

      const res = await api.get(`/purchase-orders?${query.toString()}`);
      const body = res.data;
      return {
        data: (body.data || []).map(normalizePurchaseOrder),
        total: body.total ?? body.meta?.total ?? body.data?.length ?? 0,
      };
    },
  });
};

// ========================
// GET /purchase-orders/outstanding
// ========================
export const useOutstandingPurchaseOrders = () => {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', 'outstanding'],
    queryFn: async () => {
      const res = await api.get('/purchase-orders/outstanding');
      return (res.data || []).map(normalizePurchaseOrder);
    },
  });
};

// ========================
// GET /purchase-orders/:id
// ========================
export const usePurchaseOrder = (id: string) => {
  return useQuery<PurchaseOrder>({
    queryKey: ['purchase-orders', id],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}`);
      return normalizePurchaseOrder(res.data);
    },
    enabled: !!id,
  });
};

// ========================
// GET /purchase-orders/:id/approvals
// ========================
export const usePurchaseOrderApprovals = (id: string) => {
  return useQuery<PurchaseOrderApproval[]>({
    queryKey: ['purchase-orders', id, 'approvals'],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}/approvals`);
      return res.data;
    },
    enabled: !!id,
  });
};

// ========================
// POST & PATCH Core PO
// ========================
export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PurchaseOrder>) =>
      api.post('/purchase-orders', data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
};

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PurchaseOrder> }) =>
      api.patch(`/purchase-orders/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
    },
  });
};

// ========================
// PO Lines Management
// ========================
export const useAddPoLine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      poId,
      data,
    }: {
      poId: string;
      data: Partial<PurchaseOrderLine>;
    }) => api.post(`/purchase-orders/${poId}/lines`, data),
    onSuccess: (_, { poId }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};

export const useUpdatePoLine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      poId,
      lineId,
      data,
    }: {
      poId: string;
      lineId: string;
      data: Partial<PurchaseOrderLine>;
    }) => api.patch(`/purchase-orders/${poId}/lines/${lineId}`, data),
    onSuccess: (_, { poId }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};

export const useRemovePoLine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, lineId }: { poId: string; lineId: string }) =>
      api.delete(`/purchase-orders/${poId}/lines/${lineId}`),
    onSuccess: (_, { poId }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};

// ========================
// PO Workflow Actions
// ========================
export const useSubmitPo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/submit`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};

export const useApprovePo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      api.post(`/purchase-orders/${id}/approve`, { comment }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};

export const useRejectPo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      api.post(`/purchase-orders/${id}/reject`, { comment }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};

export const useClosePo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/close`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};
