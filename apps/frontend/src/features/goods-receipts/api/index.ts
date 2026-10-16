import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface CreateGrnDto {
  shipmentId: string;
  receiptDate?: string;
  warehouseLocation?: string;
  items: any[];
}

export const useGrns = () => {
  return useQuery({
    queryKey: ['goods-receipts'],
    queryFn: () => api.get('/goods-receipts').then((res) => res.data),
  });
};

export const useGrn = (id: string) => {
  return useQuery({
    queryKey: ['goods-receipts', id],
    queryFn: () => api.get(`/goods-receipts/${id}`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGrnDto) =>
      api.post('/goods-receipts', data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
};

export const useUpdateGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/goods-receipts/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['goods-receipts', variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
};

export const useConfirmGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/goods-receipts/${id}/confirm`).then((res) => res.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts', id] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
};

export const usePostGrnToErp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/goods-receipts/${id}/post`).then((res) => res.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts', id] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
};

export const useRetryGrnPosting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/goods-receipts/${id}/retry-posting`).then((res) => res.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts', id] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
};

export const useGrnDiscrepancies = (id: string) => {
  return useQuery({
    queryKey: ['goods-receipts', id, 'discrepancies'],
    queryFn: () =>
      api.get(`/goods-receipts/${id}/discrepancies`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useGrnClaims = (id: string) => {
  return useQuery({
    queryKey: ['goods-receipts', id, 'claims'],
    queryFn: () =>
      api.get(`/goods-receipts/${id}/claims`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useUpdateClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/claims/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
};
