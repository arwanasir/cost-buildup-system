import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  shipmentId?: string;
  itemId?: string;
  hsCode?: string;
  category?: string;
  status?: string;
  period?: 'month' | 'quarter';
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

const getExportErrorMessage = async (error: any): Promise<string> => {
  const payload = error?.response?.data;

  if (payload instanceof Blob) {
    try {
      const parsed = JSON.parse(await payload.text());
      const message = parsed?.message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    } catch {
      // The response was not a JSON error payload.
    }
  } else if (payload && typeof payload === 'object') {
    const message = payload.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }

  return error?.message || 'Failed to download report';
};

const buildReportQuery = (filters: ReportFilterDto) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('date_from', filters.startDate);
  if (filters.endDate) params.set('date_to', filters.endDate);
  if (filters.supplierId) params.set('supplier_id', filters.supplierId);
  if (filters.shipmentId) params.set('shipment_id', filters.shipmentId);
  if (filters.itemId) params.set('item_id', filters.itemId);
  if (filters.hsCode) params.set('hs_code', filters.hsCode);
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.period) params.set('period', filters.period);
  return params.toString();
};

/**
 * Fetches JSON report data for a specific report key.
 */
export const useReport = (key: ReportKey, filters: ReportFilterDto = {}) => {
  return useQuery<ReportResponse>({
    queryKey: ['reports', key, filters],
    queryFn: async () => {
      const query = buildReportQuery(filters);
      const res = await api.get(`/reports/${key}${query ? `?${query}` : ''}`);
      return res.data;
    },
    // Only run if key exists
    enabled: !!key && (key !== 'landed-cost-by-item' || !!filters.itemId),
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
  const query = buildReportQuery(filters);

  try {
    const res = await api.get(
      `/reports/${key}/export/${format}${query ? `?${query}` : ''}`,
      {
        responseType: 'blob', // Critical for file downloads
      },
    );

    // Create a Blob from the response data
    const blob =
      res.data instanceof Blob
        ? res.data
        : new Blob([res.data], {
            type:
              format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
    if (blob.size === 0) {
      throw new Error('The report export returned an empty file.');
    }

    // Generate a temporary anchor tag to trigger the download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Attempt to extract filename from Content-Disposition if present
    let filename = `${key}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    const disposition = res.headers['content-disposition'];
    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
      const serverFilename = utf8Match?.[1]
        ? decodeURIComponent(utf8Match[1])
        : plainMatch?.[1];
      if (serverFilename) filename = serverFilename;
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (error: any) {
    console.error('Download failed:', error);
    throw new Error(await getExportErrorMessage(error), { cause: error });
  }
};
