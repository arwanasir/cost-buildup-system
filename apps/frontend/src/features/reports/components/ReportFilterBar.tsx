import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { Card } from '@/components/ui';
import { useSuppliers } from '@/features/suppliers/api';
import { useShipments } from '@/features/import-shipments/api';
import { useItems } from '@/features/items/api';
import { useCostCategories } from '@/features/cost-categories/api';
import type { ReportFilterDto, ReportKey } from '../api';

export interface ReportFilterBarProps {
  filters: ReportFilterDto;
  onFilterChange: (field: keyof ReportFilterDto, value: string) => void;
  onClear: () => void;
  reportKey: ReportKey;
}

const shipmentStatuses = [
  'ordered',
  'shipped',
  'at_customs',
  'cleared',
  'partially_received',
  'received',
];

const lcStatuses = [
  'applied',
  'opened',
  'advised',
  'amended',
  'docs_submitted',
  'docs_received',
  'docs_checked',
  'discrepancies_found',
  'accepted',
  'payment_authorised',
  'settled',
];

const varianceStatuses = [
  'auto_approved',
  'pending_approval',
  'approved',
  'rejected',
];

export function ReportFilterBar({
  filters,
  onFilterChange,
  onClear,
  reportKey,
}: ReportFilterBarProps) {
  const localize = useUiText();
  const { data: suppliersResponse, isLoading: suppliersLoading } = useSuppliers(
    {
      limit: 500,
    },
  );
  const { data: shipmentsResponse, isLoading: shipmentsLoading } =
    useShipments();
  const { data: itemsResponse, isLoading: itemsLoading } = useItems({
    limit: 500,
  });
  const { data: categoriesResponse, isLoading: categoriesLoading } =
    useCostCategories(reportKey === 'landed-cost-by-shipment');

  const suppliers = suppliersResponse?.data || [];
  const shipmentPayload = shipmentsResponse?.data ?? shipmentsResponse;
  const shipments = Array.isArray(shipmentPayload)
    ? shipmentPayload
    : shipmentPayload?.data || [];
  const items = itemsResponse?.data || [];
  const categories = Array.isArray(categoriesResponse)
    ? categoriesResponse.filter((category) => category.isActive)
    : [];
  const statuses =
    reportKey === 'lc-status'
      ? lcStatuses
      : reportKey === 'cost-variance'
        ? varianceStatuses
        : shipmentStatuses;
  const supportsShipment = [
    'landed-cost-by-shipment',
    'landed-cost-by-item',
    'import-cost-summary',
    'customs-duty',
    'shipment-status',
    'cost-variance',
    'supplier-performance',
  ].includes(reportKey);
  const supportsItem = [
    'landed-cost-by-shipment',
    'landed-cost-by-item',
  ].includes(reportKey);
  const hsCodes = Array.from(
    new Set(items.map((item) => item.defaultHsCode).filter(Boolean)),
  ) as string[];
  const supportsPeriod = [
    'import-cost-summary',
    'customs-duty',
    'cost-variance',
  ].includes(reportKey);

  const selectClass =
    'block h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <Card
      className="border bg-white p-4 shadow-sm"
      data-testid="report-filter-bar"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-2">
        <h4 className="font-bold text-gray-800">
          <LocalizedText text="Filter Parameters" />
        </h4>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          {localize('Clear filters')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className={labelClass}>{localize('Start Date')}</span>
          <input
            type="date"
            value={filters.startDate || ''}
            max={filters.endDate || undefined}
            onChange={(event) =>
              onFilterChange('startDate', event.target.value)
            }
            data-testid="filter-start-date"
            className={selectClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{localize('End Date')}</span>
          <input
            type="date"
            value={filters.endDate || ''}
            min={filters.startDate || undefined}
            onChange={(event) => onFilterChange('endDate', event.target.value)}
            data-testid="filter-end-date"
            className={selectClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{localize('Supplier')}</span>
          <select
            value={filters.supplierId || ''}
            onChange={(event) =>
              onFilterChange('supplierId', event.target.value)
            }
            data-testid="filter-supplier-id"
            className={selectClass}
            disabled={suppliersLoading}
          >
            <option value="">{localize('All suppliers')}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>
        {supportsShipment && (
          <label className="block">
            <span className={labelClass}>{localize('Shipment')}</span>
            <select
              value={filters.shipmentId || ''}
              onChange={(event) =>
                onFilterChange('shipmentId', event.target.value)
              }
              data-testid="filter-shipment-id"
              className={selectClass}
              disabled={shipmentsLoading}
            >
              <option value="">{localize('All shipments')}</option>
              {shipments.map((shipment: any) => (
                <option key={shipment.id} value={shipment.id}>
                  {shipment.shipmentNumber}
                </option>
              ))}
            </select>
          </label>
        )}
        {supportsItem && (
          <label className="block">
            <span className={labelClass}>{localize('Item')}</span>
            <select
              value={filters.itemId || ''}
              onChange={(event) => onFilterChange('itemId', event.target.value)}
              data-testid="filter-item-id"
              className={selectClass}
              disabled={itemsLoading}
              required={reportKey === 'landed-cost-by-item'}
            >
              <option value="">
                {reportKey === 'landed-cost-by-item'
                  ? localize('Select an item (required)')
                  : localize('All items')}
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemCode} - {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {reportKey === 'landed-cost-by-shipment' && (
          <>
            <label className="block">
              <span className={labelClass}>{localize('HS Code')}</span>
              <select
                value={filters.hsCode || ''}
                onChange={(event) =>
                  onFilterChange('hsCode', event.target.value)
                }
                data-testid="filter-hs-code"
                className={selectClass}
                disabled={itemsLoading}
              >
                <option value="">{localize('All HS Codes')}</option>
                {hsCodes.map((hsCode) => (
                  <option key={hsCode} value={hsCode}>
                    {hsCode}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>{localize('Cost Category')}</span>
              <select
                value={filters.category || ''}
                onChange={(event) =>
                  onFilterChange('category', event.target.value)
                }
                data-testid="filter-category"
                className={selectClass}
                disabled={categoriesLoading}
              >
                <option value="">{localize('All categories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.code} - {category.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="block">
            <span className={labelClass}>
              {localize(reportKey === 'cost-variance' ? 'Variance Status' : reportKey === 'lc-status' ? 'LC Status' : 'Shipment Status')}
            </span>
          <select
            value={filters.status || ''}
            onChange={(event) => onFilterChange('status', event.target.value)}
            data-testid="filter-status"
            className={selectClass}
          >
            <option value="">{localize('All statuses')}</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {localize(status.replaceAll('_', ' '))}
              </option>
            ))}
          </select>
        </label>
        {supportsPeriod && (
          <label className="block">
            <span className={labelClass}>{localize('Period Grouping')}</span>
            <select
              value={filters.period || 'month'}
              onChange={(event) =>
                onFilterChange(
                  'period',
                  event.target.value as 'month' | 'quarter',
                )
              }
              data-testid="filter-group-by"
              className={selectClass}
            >
              <option value="month">{localize('Monthly')}</option>
              <option value="quarter">{localize('Quarterly')}</option>
            </select>
          </label>
        )}
      </div>
    </Card>
  );
}
