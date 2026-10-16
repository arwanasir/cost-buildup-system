import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Supplier {
  id: string;
  name: string;
  country: string | null;
  tin: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  paymentTerms: string | null;
  defaultCurrency: string;
  leadTimeDays: number;
  isActive: boolean;
  bankAccounts?: BankAccount[];
  createdAt: string;
}

interface FetchSuppliersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export const useSuppliers = (params: FetchSuppliersParams = {}) => {
  return useQuery<{ data: Supplier[]; total: number }>({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.page !== undefined)
        query.append('page', params.page.toString());
      if (params.limit !== undefined)
        query.append('limit', params.limit.toString());
      if (params.search) query.append('search', params.search);
      if (params.isActive !== undefined)
        query.append('isActive', params.isActive.toString());

      const res = await api.get(`/suppliers?${query.toString()}`);
      const body = res.data;
      return {
        data: body.data || [],
        total: body.total ?? body.meta?.total ?? body.data?.length ?? 0,
      };
    },
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Supplier>) => api.post('/suppliers', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
      api.patch(`/suppliers/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useDeactivateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export interface BankAccount {
  id: string;
  bankName: string;
  swift: string | null;
  ibanOrAccount: string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
}

export const useAddBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      data,
    }: {
      supplierId: string;
      data: Partial<BankAccount>;
    }) => api.post(`/suppliers/${supplierId}/bank-accounts`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      accountId,
      data,
    }: {
      supplierId: string;
      accountId: string;
      data: Partial<BankAccount>;
    }) =>
      api.patch(`/suppliers/${supplierId}/bank-accounts/${accountId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useRemoveBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      accountId,
    }: {
      supplierId: string;
      accountId: string;
    }) => api.delete(`/suppliers/${supplierId}/bank-accounts/${accountId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useSupplier = (id: string) => {
  return useQuery<Supplier>({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const res = await api.get(`/suppliers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  poDate: string;
  status: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
}

export const useSupplierPurchaseOrders = (id: string, page = 1, limit = 10) => {
  return useQuery<{ data: PurchaseOrder[]; total: number }>({
    queryKey: ['suppliers', id, 'purchase-orders', page, limit],
    queryFn: async () => {
      const res = await api.get(
        `/suppliers/${id}/purchase-orders?page=${page}&limit=${limit}`,
      );
      return res.data;
    },
    enabled: !!id,
  });
};
