import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Item {
  id: string;
  itemCode: string;
  name: string;
  description: string | null;
  unitOfMeasure: string;
  defaultHsCode: string | null;
  isActive: boolean;
  createdAt: string;
}

interface FetchItemsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export const useItems = (params: FetchItemsParams = {}) => {
  return useQuery<{ data: Item[]; total: number }>({
    queryKey: ['items', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.page !== undefined)
        query.append('page', params.page.toString());
      if (params.limit !== undefined)
        query.append('limit', params.limit.toString());
      if (params.search) query.append('search', params.search);
      if (params.isActive !== undefined)
        query.append('isActive', params.isActive.toString());

      const res = await api.get(`/items?${query.toString()}`);
      const body = res.data;
      return {
        data: body.data || [],
        total: body.total ?? body.meta?.total ?? body.data?.length ?? 0,
      };
    },
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Item>) => api.post('/items', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Item> }) =>
      api.patch(`/items/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });
};

export const useDeactivateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/items/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });
};

export const useSearchItems = (query: string) => {
  return useQuery<Item[]>({
    queryKey: ['items', 'search', query],
    queryFn: async () => {
      const res = await api.get(`/items/search?q=${query}`);
      const body = res.data;
      return body.data || body || [];
    },
    enabled: query.length >= 2,
  });
};
