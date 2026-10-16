import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Setting {
  id: string;
  key: string;
  valueNumeric: string | null;
  valueText: string | null;
  description: string;
}

export const useSettings = () => {
  return useQuery<Setting[]>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.data || res.data;
    },
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      valueNumeric,
      valueText,
    }: {
      key: string;
      valueNumeric?: number;
      valueText?: string;
    }) => api.patch(`/settings/${key}`, { valueNumeric, valueText }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
};
