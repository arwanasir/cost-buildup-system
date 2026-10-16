import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  poId?: string;
  shipmentId?: string;
  groupBy?: string;
  itemId?: string;
  status?: string;
  category?: string;
}

export interface ReportResponse {
  columns: string[];
  rows: any[];
  totals: Record<string, any>;
  generated_at: string;
}

export type ReportKey =
  | 'landed-cost-by-shipment'
  | 'landed-cost-by-item'
  | 'landed-cost-by-supplier'
  | 'import-cost-summary'
  | 'lc-status'
  | 'customs-duty'
  | 'shipment-status'
  | 'cost-variance'
  | 'supplier-performance';

/**
 * Fetches JSON report data for a specific report key.
 */
export const useReport = (key: ReportKey, filters: ReportFilterDto = {}) => {
  return useQuery<ReportResponse>({
    queryKey: ['reports', key, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters.startDate) qs.append('startDate', filters.startDate);
      if (filters.endDate) qs.append('endDate', filters.endDate);
      if (filters.supplierId) qs.append('supplierId', filters.supplierId);
      if (filters.poId) qs.append('poId', filters.poId);
      if (filters.shipmentId) qs.append('shipmentId', filters.shipmentId);
      if (filters.groupBy) qs.append('groupBy', filters.groupBy);
      if (filters.itemId) qs.append('itemId', filters.itemId);
      if (filters.status) qs.append('status', filters.status);
      if (filters.category) qs.append('category', filters.category);
      if (filters.itemId) qs.append('itemId', filters.itemId);
      if (filters.status) qs.append('status', filters.status);
      if (filters.category) qs.append('category', filters.category);

      const res = await api.get(`/reports/${key}?${qs.toString()}`);
      return res.data;
    },
    // Only run if key exists
    enabled: !!key,
  });
};

/**
 * Utility to download an exported report (PDF or Excel).
 * This uses the fetch API manually via the customized axios instance,
 * but specifically configured to receive a 'blob' response type
 * so we can trigger a file download in the browser.
 */
export const downloadExport = async (
  key: ReportKey,
  format: 'pdf' | 'excel',
  filters: ReportFilterDto = {},
) => {
  const qs = new URLSearchParams();
  qs.append('format', format);
  if (filters.startDate) qs.append('startDate', filters.startDate);
  if (filters.endDate) qs.append('endDate', filters.endDate);
  if (filters.supplierId) qs.append('supplierId', filters.supplierId);
  if (filters.poId) qs.append('poId', filters.poId);
  if (filters.shipmentId) qs.append('shipmentId', filters.shipmentId);
  if (filters.groupBy) qs.append('groupBy', filters.groupBy);
  if (filters.itemId) qs.append('itemId', filters.itemId);
  if (filters.status) qs.append('status', filters.status);
  if (filters.category) qs.append('category', filters.category);
  if (filters.itemId) qs.append('itemId', filters.itemId);
  if (filters.status) qs.append('status', filters.status);
  if (filters.category) qs.append('category', filters.category);

  try {
    const res = await api.get(`/reports/${key}/export?${qs.toString()}`, {
      responseType: 'blob', // Critical for file downloads
    });

    // Create a Blob from the response data
    const blob = new Blob([res.data], {
      type:
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Generate a temporary anchor tag to trigger the download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Attempt to extract filename from Content-Disposition if present
    let filename = `${key}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    const disposition = res.headers['content-disposition'];
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Download failed:', error);
    throw new Error(error.message || 'Failed to download report', {
      cause: error,
    });
  }
};
