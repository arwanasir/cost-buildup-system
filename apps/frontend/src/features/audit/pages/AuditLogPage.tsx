import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api-client';
import {
  Table,
  Button,
  Modal,
  Input,
  Select,
  DatePicker,
  Skeleton,
  ErrorState,
  Badge,
} from '@/components/ui';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  beforeValue: any;
  afterValue: any;
  occurredAt: string;
}

const ENTITY_TYPES = [
  { label: 'All Entities', value: '' },
  { label: 'Purchase Order', value: 'PURCHASE_ORDER' },
  { label: 'Letter of Credit', value: 'LETTER_OF_CREDIT' },
  { label: 'Import Shipment', value: 'IMPORT_SHIPMENT' },
  { label: 'Goods Receipt', value: 'GOODS_RECEIPT' },
  { label: 'Cost Register', value: 'COST_REGISTER' },
  { label: 'Policy Setting', value: 'POLICY_SETTING' },
  { label: 'User', value: 'USER' },
  { label: 'Tariff', value: 'TARIFF' },
];

export function AuditLogPage() {
  const [filters, setFilters] = useState({
    entity_type: '',
    entity_id: '',
    actor_id: '',
    from: '',
    to: '',
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<{
    data: AuditLog[];
    total: number;
  }>({
    queryKey: ['auditLogs', appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.entity_type)
        params.append('entity_type', appliedFilters.entity_type);
      if (appliedFilters.entity_id)
        params.append('entity_id', appliedFilters.entity_id);
      if (appliedFilters.actor_id)
        params.append('actor_id', appliedFilters.actor_id);
      if (appliedFilters.from) params.append('from', appliedFilters.from);
      if (appliedFilters.to) params.append('to', appliedFilters.to);
      params.append('limit', '50'); // limit to 50 for now

      const res = await api.get(`/audit?${params.toString()}`);
      return res.data;
    },
  });

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    const cleared = {
      entity_type: '',
      entity_id: '',
      actor_id: '',
      from: '',
      to: '',
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: (row: AuditLog) =>
        format(new Date(row.occurredAt), 'yyyy-MM-dd HH:mm:ss'),
    },
    {
      header: 'Action',
      accessor: (row: AuditLog) => (
        <Badge
          variant={
            row.action === 'create'
              ? 'success'
              : row.action === 'update'
                ? 'warning'
                : 'danger'
          }
        >
          {row.action.toUpperCase()}
        </Badge>
      ),
    },
    { header: 'Entity Type', accessor: 'entityType' as keyof AuditLog },
    {
      header: 'Entity ID',
      accessor: (row: AuditLog) => (
        <span className="font-mono text-xs">{row.entityId}</span>
      ),
    },
    {
      header: 'Actor ID',
      accessor: (row: AuditLog) => (
        <span className="font-mono text-xs">{row.actorId}</span>
      ),
    },
    {
      header: 'Payload',
      accessor: (row: AuditLog) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="text-blue-600 hover:text-blue-900 font-medium text-sm underline"
        >
          View Diff
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            System Audit Log
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Immutable ledger of all critical system mutations. Restricted to
            System Admin and Finance Manager.
          </p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg border border-gray-200">
        <form
          onSubmit={handleApplyFilters}
          className="p-4 space-y-4 sm:space-y-0 sm:flex sm:gap-4 sm:items-end"
        >
          <Select
            label="Entity Type"
            options={ENTITY_TYPES}
            value={filters.entity_type}
            onChange={(e) =>
              setFilters({ ...filters, entity_type: e.target.value })
            }
          />
          <Input
            label="Entity ID"
            placeholder="UUID..."
            value={filters.entity_id}
            onChange={(e) =>
              setFilters({ ...filters, entity_id: e.target.value })
            }
          />
          <Input
            label="Actor ID"
            placeholder="UUID..."
            value={filters.actor_id}
            onChange={(e) =>
              setFilters({ ...filters, actor_id: e.target.value })
            }
          />
          <DatePicker
            label="From Date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <DatePicker
            label="To Date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit">Filter</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : isError ? (
        <ErrorState
          message="Failed to load audit logs. Ensure you have the correct permissions."
          onRetry={() => refetch()}
        />
      ) : (
        <Table columns={columns} data={data?.data || []} />
      )}

      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`${selectedLog.action.toUpperCase()} - ${selectedLog.entityType}`}
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
                  Before State
                </h4>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono text-red-700">
                    {selectedLog.beforeValue
                      ? JSON.stringify(selectedLog.beforeValue, null, 2)
                      : 'null'}
                  </pre>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
                  After State
                </h4>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono text-green-700">
                    {selectedLog.afterValue
                      ? JSON.stringify(selectedLog.afterValue, null, 2)
                      : 'null'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-5 sm:mt-6">
              <Button onClick={() => setSelectedLog(null)} className="w-full">
                Close Viewer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
