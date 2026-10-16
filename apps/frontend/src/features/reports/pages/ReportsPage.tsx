import React, { useState } from 'react';
import { PageHeader, Card, Button } from '@/components/ui';
import { ReportTable } from '../components/ReportTable';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { useAuthStore } from '@/store/auth.store';
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
  const { hasPermission } = useAuthStore();

  // Filter available reports based on exact permissions (or admin bypass built into hasPermission)
  const availableReports = REPORTS.filter(
    (r) => hasPermission(r.perm) || hasPermission('admin:all'),
  );

  const [activeReportKey, setActiveReportKey] = useState<ReportKey | null>(
    availableReports.length > 0 ? (availableReports[0].key as ReportKey) : null,
  );

  const [filters, setFilters] = useState<ReportFilterDto>({});
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const {
    data: reportData,
    isLoading,
    isFetching,
  } = useReport(activeReportKey as ReportKey, filters);

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!activeReportKey) return;
    if (format === 'excel') setIsExportingExcel(true);
    else setIsExportingPdf(true);
    try {
      await downloadExport(activeReportKey, format, filters);
    } finally {
      if (format === 'excel') setIsExportingExcel(false);
      else setIsExportingPdf(false);
    }
  };

  const handleFilterChange = (field: keyof ReportFilterDto, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value || undefined }));
  };

  if (availableReports.length === 0) {
    return (
      <div className="p-8 text-center text-red-500">
        You do not have permission to view any reports.
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
          title="Reporting Engine"
          description="Generate, filter, and export analytics (FR-11)."
        />
        {activeReportKey && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              disabled={isFetching || isExportingPdf}
              isLoading={isExportingExcel}
            >
              Export to Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('pdf')}
              disabled={isFetching || isExportingExcel}
              isLoading={isExportingPdf}
            >
              Export to PDF
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Navigation Sidebar */}
        <Card className="w-full lg:w-64 shrink-0 p-0 overflow-hidden shadow-sm border bg-white">
          <div className="p-3 border-b bg-gray-50 font-bold text-gray-800">
            Available Reports
          </div>
          <nav className="flex flex-col divide-y text-sm">
            {availableReports.map((report) => {
              const isActive = activeReportKey === report.key;
              return (
                <button
                  key={report.key}
                  onClick={() => setActiveReportKey(report.key as ReportKey)}
                  className={`text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-l-4 border-blue-600 font-bold text-blue-900'
                      : 'text-gray-600'
                  }`}
                >
                  {report.label}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Report Content */}
        <div className="flex-1 space-y-4 w-full">
          {/* Filter Bar */}
          <ReportFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {/* Results Grid */}
          <Card className="p-0 bg-white border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">
                {activeReportConfig?.label} Results
              </h3>
              {reportData?.generated_at && (
                <span className="text-xs text-gray-500">
                  Generated:{' '}
                  {new Date(reportData.generated_at).toLocaleString()}
                </span>
              )}
            </div>

            <div className="p-4">
              {isLoading || isFetching ? (
                <div className="text-center text-gray-500 py-8">
                  Running analytics...
                </div>
              ) : !reportData || reportData.rows.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No data matched the selected filters.
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
                              Cost Allocation Breakdown
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
                                        {Number(v).toLocaleString()} ETB
                                      </span>
                                    </div>
                                  ),
                                )}
                            </div>
                          </div>
                        )
                      : activeReportKey === 'landed-cost-by-item'
                        ? (row) => (
                            <div className="p-4 text-sm">
                              <h4 className="font-bold mb-2">
                                Cost Breakdown (Trend placeholder)
                              </h4>
                              <div className="flex items-end gap-2 h-24 mt-4 border-b border-l p-2">
                                {row.totalBreakdown &&
                                  Object.entries(row.totalBreakdown).map(
                                    ([k, v], i) => (
                                      <div
                                        key={k}
                                        className="flex flex-col items-center justify-end h-full flex-1 group relative"
                                      >
                                        <div
                                          className="w-full bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-all"
                                          style={{
                                            height: `${(Number(v) / Math.max(...Object.values(row.totalBreakdown).map(Number))) * 100}%`,
                                          }}
                                        ></div>
                                        <span
                                          className="text-[10px] text-gray-500 mt-1 truncate w-full text-center"
                                          title={k}
                                        >
                                          {k.slice(0, 5)}
                                        </span>
                                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-xs p-1 rounded whitespace-nowrap z-50">
                                          {k}: {Number(v).toLocaleString()} ETB
                                        </div>
                                      </div>
                                    ),
                                  )}
                              </div>
                            </div>
                          )
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
