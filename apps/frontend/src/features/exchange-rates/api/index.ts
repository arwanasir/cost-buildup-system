import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface ExchangeRate {
  id: string;
  currency: string;
  rateDate: string;
  rate: string;
  createdAt: string;
}

export const useExchangeRates = () => {
  return useQuery<ExchangeRate[]>({
    queryKey: ['exchangeRates'],
    queryFn: async () => {
      const res = await api.get('/nbe-rates');
      return res.data.data || res.data;
    },
  });
};

export const useCreateExchangeRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/nbe-rates', data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] }),
  });
};

export const useLatestExchangeRate = (currency: string) => {
  return useQuery<ExchangeRate>({
    queryKey: ['exchangeRates', 'latest', currency],
    queryFn: async () => {
      const res = await api.get(`/nbe-rates/latest?currency=${currency}`);
      return res.data;
    },
    enabled: !!currency && currency !== 'ETB',
  });
};
