import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const useVariances = (params?: {
  status?: string;
  shipmentId?: string;
}) => {
  return useQuery({
    queryKey: ['variances', params],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.status) qs.append('status', params.status);
      if (params?.shipmentId) qs.append('shipment_id', params.shipmentId);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return api.get(`/variances${query}`).then((res) => res.data);
    },
  });
};

export const useShipmentVariances = (shipmentId: string) => {
  return useQuery({
    queryKey: ['variances', 'shipment', shipmentId],
    queryFn: () =>
      api.get(`/shipments/${shipmentId}/variances`).then((res) => res.data),
    enabled: !!shipmentId,
  });
};

export const useApproveVariance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.post(`/variances/${id}/approve`, { comment }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variances'] });
    },
  });
};

export const useRejectVariance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.post(`/variances/${id}/reject`, { comment }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variances'] });
    },
  });
};

export const useEvaluateShipmentVariances = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      api
        .post(`/shipments/${shipmentId}/variances/evaluate`)
        .then((res) => res.data),
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({
        queryKey: ['variances', 'shipment', shipmentId],
      });
      queryClient.invalidateQueries({ queryKey: ['variances'] });
    },
  });
};
