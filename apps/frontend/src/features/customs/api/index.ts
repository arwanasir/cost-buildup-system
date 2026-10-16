import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// --- Types ---

export interface CustomsDeclarationItem {
  id: string;
  declarationId: string;
  shipmentItemId: string;
  hsCode: string;
  dutyStructure: 'ad_valorem' | 'specific_rate' | 'compound' | 'exempt';
  dutyRate: string;
  specificDutyPerUnit: string;
  cifValueEtb: string;
  dutyEtb: string;
  vatRate: string;
  vatEtb: string;
  exciseRate: string;
  exciseEtb: string;
  withholdingRate: string;
  withholdingEtb: string;
  isRateOverridden: boolean;
  overrideReason: string | null;
  // expanded relations
  shipmentItem?: any;
}

export interface CustomsDeclaration {
  id: string;
  shipmentId: string;
  declarationNumber: string;
  declarationDate: string;
  clearingAgent: string | null;
  cifValueEtb: string;
  totalDutyEtb: string;
  totalVatEtb: string;
  totalExciseEtb: string;
  totalWithholdingEtb: string;
  totalAssessmentEtb: string;
  status: 'draft' | 'assessed' | 'paid' | 'released';
  releaseDate: string | null;
  releaseReference: string | null;
  customsOfficer: string | null;
  createdAt: string;

  items?: CustomsDeclarationItem[];
  payments?: DutyPayment[];
  shipment?: any;
}

export interface DutyPayment {
  id: string;
  declarationId: string;
  paymentDate: string;
  bankReference: string | null;
  amountPaidEtb: string;
  receiptNumber: string;
  isFlagged: boolean;
  flagReason: string | null;
  createdAt: string;
}

export interface TariffLookup {
  hsCode: string;
  description: string;
  structure: string;
  dutyRate: number;
  vatRate: number;
  exciseRate: number;
  withholdingRate: number;
  surTaxRate: number;
}

// --- DTOs ---

export interface CreateDeclarationDto {
  shipmentId: string;
  declarationNumber: string;
  declarationDate: string;
  clearingAgent?: string;
  fxRate: number;
  itemOverrides?: {
    shipmentItemId: string;
    isRateOverridden?: boolean;
    overrideReason?: string;
    dutyRate?: number;
    exciseRate?: number;
    vatRate?: number;
    withholdingRate?: number;
  }[];
}

export interface UpdateDeclarationItemDto {
  isRateOverridden: boolean;
  overrideReason?: string;
  dutyRate?: number;
  exciseRate?: number;
  vatRate?: number;
  withholdingRate?: number;
}

export interface CreateDutyPaymentDto {
  paymentDate: string;
  bankReference?: string;
  amountPaidEtb: number;
  receiptNumber: string;
}

export interface CreateReleaseDto {
  releaseDate: string;
  releaseReference: string;
  customsOfficer?: string;
}

// --- Hooks ---

export const useCustomsDeclarations = (params?: {
  status?: string;
  shipmentId?: string;
}) => {
  return useQuery({
    queryKey: ['customs-declarations', params],
    queryFn: () =>
      api
        .get<CustomsDeclaration[]>('/customs', { params })
        .then((res) => res.data),
  });
};

export const useCustomsDeclaration = (id: string) => {
  return useQuery({
    queryKey: ['customs-declarations', id],
    queryFn: () =>
      api.get<CustomsDeclaration>(`/customs/${id}`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateDeclaration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeclarationDto) =>
      api.post<CustomsDeclaration>('/customs', data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-declarations'] });
      // Might also affect shipment queries
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

export const useAssessDeclaration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api
        .post<CustomsDeclaration>(`/customs/${id}/assess`)
        .then((res) => res.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customs-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['customs-declarations', id] });
    },
  });
};

export const useOverrideItemRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      itemId,
      data,
    }: {
      id: string;
      itemId: string;
      data: UpdateDeclarationItemDto;
    }) =>
      api
        .patch<CustomsDeclarationItem>(`/customs/${id}/items/${itemId}`, data)
        .then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customs-declarations', id] });
    },
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateDutyPaymentDto }) =>
      api
        .post<DutyPayment>(`/customs/${id}/payments`, data)
        .then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customs-declarations', id] });
      queryClient.invalidateQueries({ queryKey: ['customs-payments', id] });
    },
  });
};

export const useReleaseDeclaration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateReleaseDto }) =>
      api
        .post<CustomsDeclaration>(`/customs/${id}/release`, data)
        .then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customs-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['customs-declarations', id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

export const useDeclarationPayments = (id: string) => {
  return useQuery({
    queryKey: ['customs-payments', id],
    queryFn: () =>
      api.get<DutyPayment[]>(`/customs/${id}/payments`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useTariffLookup = (hsCode: string) => {
  return useQuery({
    queryKey: ['customs-tariff', hsCode],
    queryFn: () =>
      api
        .get<TariffLookup>(`/customs/tariff/${hsCode}`)
        .then((res) => res.data),
    enabled: !!hsCode && hsCode.length >= 4,
  });
};
