import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { PageHeader, Card, Button } from '@/components/ui';
import { ReportTable } from '../components/ReportTable';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { useAuthStore } from '@/store/auth.store';
import { formatAmount4 } from '@/lib/money';
import {
  useReport,
  downloadExport,
  type ReportKey,
  type ReportFilterDto,
} from '../api';

const REPORTS = [
  {
    key: 'landed-cost-by-shipment',
    label: 'Landed Cost by Shipment',
    perm: 'report:landed_cost_shipment:read',
  },
  {
    key: 'landed-cost-by-item',
    label: 'Landed Cost by Item',
    perm: 'report:landed_cost_item:read',
  },
  {
    key: 'landed-cost-by-supplier',
    label: 'Landed Cost by Supplier',
    perm: 'report:landed_cost_supplier:read',
  },
  {
    key: 'import-cost-summary',
    label: 'Import Cost Summary',
    perm: 'report:import_cost_summary:read',
  },
  {
    key: 'lc-status',
    label: 'Letter of Credit Status',
    perm: 'report:lc_status:read',
  },
  {
    key: 'customs-duty',
    label: 'Customs Duty Analysis',
    perm: 'report:customs_duty:read',
  },
  {
    key: 'shipment-status',
    label: 'Shipment Status Matrix',
    perm: 'report:shipment_status:read',
  },
  {
    key: 'cost-variance',
    label: 'Cost Variance Analytics',
    perm: 'report:cost_variance:read',
  },
  {
    key: 'supplier-performance',
    label: 'Supplier Performance',
    perm: 'report:supplier_performance:read',
  },
] as const;

export function ReportsPage() {
  const localize = useUiText();
  const { hasPermission } = useAuthStore();

  // Filter available reports based on exact permissions (or admin bypass built into hasPermission)
  const availableReports = REPORTS.filter(
    (r) => hasPermission(r.perm) || hasPermission('admin:all'),
  );

  const [selectedReportKey, setSelectedReportKey] = useState<ReportKey | null>(
    (availableReports[0]?.key as ReportKey | undefined) ?? null,
  );
  const activeReportKey = (availableReports.find(
    (report) => report.key === selectedReportKey,
  )?.key ??
    availableReports[0]?.key ??
    null) as ReportKey | null;

  const [filters, setFilters] = useState<ReportFilterDto>({});
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  const {
    data: reportData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useReport(activeReportKey as ReportKey, filters);

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!activeReportKey) return;
    setExportError('');
    setExportSuccess('');
    if (format === 'excel') setIsExportingExcel(true);
    else setIsExportingPdf(true);
    try {
      await downloadExport(activeReportKey, format, filters);
      setExportSuccess(
        localize(`${format === 'excel' ? 'Excel' : 'PDF'} report downloaded.`),
      );
    } catch (error: any) {
      setExportError(
        error.response?.data?.message ||
          error.message ||
          localize(`Failed to export report as ${format.toUpperCase()}.`),
      );
    } finally {
      if (format === 'excel') setIsExportingExcel(false);
      else setIsExportingPdf(false);
    }
  };

  const handleFilterChange = (field: keyof ReportFilterDto, value: string) => {
    setExportError('');
    setExportSuccess('');
    setFilters((prev) => ({ ...prev, [field]: value || undefined }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setExportError('');
    setExportSuccess('');
  };

  const itemRequired =
    activeReportKey === 'landed-cost-by-item' && !filters.itemId;

  if (availableReports.length === 0) {
    return (
      <div className="p-8 text-center text-red-500">
        <LocalizedText
          text={
            '\n        You do not have permission to view any reports.\n      '
          }
        />
      </div>
    );
  }

  const activeReportConfig = availableReports.find(
    (r) => r.key === activeReportKey,
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title={localize('Reporting Engine')}
          description={localize(
            'Generate, filter, and export analytics (FR-11).',
          )}
        />
        {activeReportKey && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              disabled={isFetching || isExportingPdf || itemRequired}
              isLoading={isExportingExcel}
            >
              <LocalizedText
                text={'\n              Export to Excel\n            '}
              />
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('pdf')}
              disabled={isFetching || isExportingExcel || itemRequired}
              isLoading={isExportingPdf}
            >
              <LocalizedText
                text={'\n              Export to PDF\n            '}
              />
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Navigation Sidebar */}
        <Card className="w-full lg:w-64 shrink-0 p-0 overflow-hidden shadow-sm border bg-white">
          <div className="p-3 border-b bg-gray-50 font-bold text-gray-800">
            <LocalizedText
              text={'\n            Available Reports\n          '}
            />
          </div>
          <nav className="flex flex-col divide-y text-sm">
            {availableReports.map((report) => {
              const isActive = activeReportKey === report.key;
              return (
                <button
                  key={report.key}
                  onClick={() => {
                    setSelectedReportKey(report.key as ReportKey);
                    setFilters({});
                    setFilters({});
                    setExportError('');
                    setExportSuccess('');
                  }}
                  aria-pressed={isActive}
                  className={`text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-l-4 border-blue-600 font-bold text-blue-900'
                      : 'text-gray-600'
                  }`}
                >
                  {localize(report.label)}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Report Content */}
        <div className="min-w-0 flex-1 space-y-4 w-full">
          {/* Filter Bar */}
          <ReportFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
            reportKey={activeReportKey as ReportKey}
          />

          {exportError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span>{exportError}</span>
              <button
                type="button"
                aria-label={localize('Dismiss export error')}
                onClick={() => setExportError('')}
                className="font-semibold"
              >
                ×
              </button>
            </div>
          )}
          {exportSuccess && (
            <div
              role="status"
              className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            >
              {exportSuccess}
            </div>
          )}

          {/* Results Grid */}
          <Card className="p-0 bg-white border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">
                {activeReportConfig ? localize(activeReportConfig.label) : ''}{' '}
                <LocalizedText text={' Results\n              '} />
              </h3>
              {reportData?.generated_at && (
                <span className="text-xs text-gray-500">
                  <LocalizedText text={'\n                  Generated:'} />
                  <LocalizedText text={' '} />
                  {new Date(reportData.generated_at).toLocaleString()}
                </span>
              )}
            </div>

            <div className="p-4">
              {isLoading || isFetching ? (
                <div className="text-center text-gray-500 py-8">
                  <LocalizedText
                    text={
                      '\n                  Running analytics...\n                '
                    }
                  />
                </div>
              ) : isError ? (
                <div className="py-8 text-center" role="alert">
                  <p className="text-sm text-red-700">
                    {localize(
                      (error as any)?.response?.data?.message ||
                        (error as any)?.message ||
                        'Failed to load report data.',
                    )}
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={() => refetch()}
                  >
                    {localize('Retry')}
                  </Button>
                </div>
              ) : itemRequired ? (
                <div className="py-8 text-center text-gray-500">
                  {localize('Select an item to run this report.')}
                </div>
              ) : !reportData || reportData.rows.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {activeReportKey === 'landed-cost-by-supplier' ? (
                    <div>
                      <p>
                        {localize(
                          'No landed-cost results match these filters.',
                        )}
                      </p>
                      <p className="mt-2 text-sm">
                        {localize(
                          'This report includes suppliers only after a shipment has a computed landed-cost result.',
                        )}
                      </p>
                    </div>
                  ) : (
                    <LocalizedText
                      text={
                        '\n                  No data matched the selected filters.\n                '
                      }
                    />
                  )}
                </div>
              ) : (
                <ReportTable
                  columns={reportData.columns}
                  rows={reportData.rows}
                  totals={reportData.totals}
                  expandableRow={
                    activeReportKey === 'landed-cost-by-shipment'
                      ? (row) => (
                          <div className="p-4 text-sm">
                            <h4 className="font-bold mb-2">
                              <LocalizedText
                                text={
                                  '\n                              Cost Allocation Breakdown\n                            '
                                }
                              />
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {row.categoryTotals &&
                                Object.entries(row.categoryTotals).map(
                                  ([k, v]) => (
                                    <div
                                      key={k}
                                      className="bg-white p-2 border rounded shadow-sm flex flex-col"
                                    >
                                      <span className="text-xs text-gray-500 uppercase">
                                        {k.replace(/_/g, ' ')}
                                      </span>
                                      <span className="font-bold">
                                        {formatAmount4(Number(v))}{' '}
                                        <LocalizedText
                                          text={
                                            ' ETB\n                                      '
                                          }
                                        />
                                      </span>
                                    </div>
                                  ),
                                )}
                            </div>
                          </div>
                        )
                      : activeReportKey === 'landed-cost-by-item'
                        ? (row) => {
                            const breakdown = Object.entries(
                              row.perUnitBreakdown || {},
                            );
                            const maxValue = Math.max(
                              1,
                              ...breakdown.map(([, value]) => Number(value)),
                            );
                            return (
                              <div className="p-4 text-sm">
                                <h4 className="mb-2 font-bold">
                                  {localize('Per-unit cost breakdown')}
                                </h4>
                                {breakdown.length === 0 ? (
                                  <p className="text-gray-500">
                                    {localize('No cost breakdown available.')}
                                  </p>
                                ) : (
                                  <div className="flex h-32 items-end gap-2 overflow-x-auto border-b border-l p-2">
                                    {breakdown.map(([name, value]) => (
                                      <div
                                        key={name}
                                        className="group relative flex h-full min-w-12 flex-1 flex-col items-center justify-end"
                                      >
                                        <div
                                          className="w-full rounded-t bg-blue-600 opacity-80 transition-opacity group-hover:opacity-100"
                                          style={{
                                            height: `${Math.max(2, (Number(value) / maxValue) * 100)}%`,
                                          }}
                                        />
                                        <span
                                          className="mt-1 w-full truncate text-center text-[10px] text-gray-600"
                                          title={name}
                                        >
                                          {name}
                                        </span>
                                        <span className="absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                                          {name}: {formatAmount4(Number(value))}{' '}
                                          ETB
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        : undefined
                  }
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
