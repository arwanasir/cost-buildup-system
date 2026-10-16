import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Tariff {
  id: string;
  hsCode: string;
  description: string;
  dutyStructure: 'ad_valorem' | 'specific';
  dutyRate: string;
  specificDutyPerUnit: string;
  exciseRate: string;
  withholdingRate: string;
  effectiveFrom: string;
  isActive: boolean;
}

export const useTariffs = () => {
  return useQuery<Tariff[]>({
    queryKey: ['tariffs'],
    queryFn: async () => {
      const res = await api.get('/tariffs');
      return res.data.data || res.data;
    },
  });
};

export const useCreateTariff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/tariffs', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tariffs'] }),
  });
};

export const useUpdateTariff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ hsCode, data }: { hsCode: string; data: any }) =>
      api.patch(`/tariffs/${hsCode}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tariffs'] }),
  });
};
