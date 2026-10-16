import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface CostCategory {
  id: string;
  code: string;
  name: string;
  defaultAllocationMethod: string;
  isItemSpecific: boolean;
  isActive: boolean;
  sortOrder: number;
}

export const useCostCategories = () => {
  return useQuery<CostCategory[]>({
    queryKey: ['costCategories'],
    queryFn: async () => {
      const res = await api.get('/cost-categories');
      return res.data.data || res.data;
    },
  });
};

export const useCreateCostCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/cost-categories', data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['costCategories'] }),
  });
};

export const useUpdateCostCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/cost-categories/${id}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['costCategories'] }),
  });
};

export const useToggleCostCategoryActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!isActive) {
        return api.delete(`/cost-categories/${id}`);
      }
      return api.patch(`/cost-categories/${id}`, { isActive: true });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['costCategories'] }),
  });
};
