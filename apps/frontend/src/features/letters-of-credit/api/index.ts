import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export type LcStatus =
  | 'draft'
  | 'applied'
  | 'pending_gm_approval'
  | 'approved'
  | 'rejected'
  | 'opened'
  | 'amended'
  | 'closed';

export interface LetterOfCredit {
  id: string;
  poId: string;
  supplierId: string;
  lcNumber: string | null;
  issuingBank: string;
  advisingBank: string | null;
  lcType: string;
  amountForeign: string;
  currency: string;
  fxRate: string;
  amountEtb: string;
  openingDate: string | null;
  expiryDate: string;
  lastShipmentDate: string | null;
  presentationPeriodDays: number | null;
  incoterm: string | null;
  partialShipmentAllowed: boolean | null;
  status: LcStatus;
  marginDepositEtb: string | null;
  openingChargeEtb: string | null;
  supplier?: { name: string; country?: string };
  pos?: { poNumber: string }[];
  gmApprovedBy?: string | null;
  documents?: any[];
  amendments?: any[];
}

export const useLettersOfCredit = () => {
  return useQuery<{ data: LetterOfCredit[]; total: number }>({
    queryKey: ['lettersOfCredit'],
    queryFn: async () => {
      const res = await api.get('/letters-of-credit');
      return res.data;
    },
  });
};

export const useLetterOfCredit = (id: string) => {
  return useQuery<{ data: LetterOfCredit }>({
    queryKey: ['lettersOfCredit', id],
    queryFn: async () => {
      const res = await api.get(`/letters-of-credit/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateLetterOfCredit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/letters-of-credit', data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['lettersOfCredit'] }),
  });
};

export const useGmApproveLc = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/letters-of-credit/${id}/gm-approve`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['lettersOfCredit'] });
      queryClient.invalidateQueries({ queryKey: ['lettersOfCredit', id] });
    },
  });
};

export const useUpdateLcStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      remarks,
    }: {
      id: string;
      status: LcStatus;
      remarks?: string;
    }) => api.patch(`/letters-of-credit/${id}/status`, { status, remarks }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['lettersOfCredit'] });
      queryClient.invalidateQueries({ queryKey: ['lettersOfCredit', id] });
    },
  });
};

export const useAmendLc = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/letters-of-credit/${id}/amendments`, data),
    onSuccess: (_, { id }) =>
      queryClient.invalidateQueries({ queryKey: ['lettersOfCredit', id] }),
  });
};

export const useLcCharges = (id: string) => {
  return useQuery<{ data: any[] }>({
    queryKey: ['lettersOfCredit', id, 'charges'],
    queryFn: async () => {
      const res = await api.get(`/letters-of-credit/${id}/charges`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useMarkDocumentReceived = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      docId,
      isReceived,
    }: {
      id: string;
      docId: string;
      isReceived: boolean;
    }) =>
      api.patch(`/letters-of-credit/${id}/documents/${docId}`, { isReceived }),
    onSuccess: (_, { id }) =>
      queryClient.invalidateQueries({ queryKey: ['lettersOfCredit', id] }),
  });
};

export const useAddLcCharge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/letters-of-credit/${id}/charges`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['lettersOfCredit', id, 'charges'],
      });
      queryClient.invalidateQueries({ queryKey: ['lettersOfCredit', id] });
    },
  });
};
