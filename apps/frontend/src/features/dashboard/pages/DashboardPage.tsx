import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/Skeleton';

function DashboardCard({
  title,
  value,
  color,
  isLoading,
  isError,
}: {
  title: string;
  value: number | string;
  color: string;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (isError) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-sm text-red-600">Error loading data</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const countResponse = (response: any) => {
    if (Array.isArray(response)) return response.length;
    return (
      response?.meta?.total ??
      response?.total ??
      (Array.isArray(response?.data) ? response.data.length : 0)
    );
  };

  const queries = useQueries({
    queries: [
      {
        queryKey: ['kpi', 'pos'],
        queryFn: async () => {
          const res = await api.get('/purchase-orders?status=pending_approval');
          return countResponse(res.data);
        },
      },
      {
        queryKey: ['kpi', 'lcs'],
        queryFn: async () => {
          // Typically we would pass ?expiresWithin=30 but for safety we fetch and filter if needed
          const res = await api.get('/letters-of-credit');
          const data = res.data.data || res.data;
          const now = new Date();
          const limit = new Date();
          limit.setDate(now.getDate() + 30);
          return data.filter(
            (lc: any) =>
              new Date(lc.latestShipmentDate || lc.createdAt) <= limit,
          ).length;
        },
      },
      {
        queryKey: ['kpi', 'shipments'],
        queryFn: async () => {
          const res = await api.get('/import-shipments?status=at_customs');
          return countResponse(res.data);
        },
      },
      {
        queryKey: ['kpi', 'cost-registers'],
        queryFn: async () => {
          const res = await api.get('/import-shipments?status=cleared');
          return countResponse(res.data);
        },
      },
      {
        queryKey: ['kpi', 'variances'],
        queryFn: async () => {
          const res = await api.get('/variances?status=pending_approval');
          return countResponse(res.data);
        },
      },
      {
        queryKey: ['kpi', 'grns'],
        queryFn: async () => {
          const res = await api.get('/goods-receipts?status=posting_failed');
          return countResponse(res.data);
        },
      },
    ],
  });

  const [
    posQuery,
    lcsQuery,
    shipmentsQuery,
    costRegistersQuery,
    variancesQuery,
    grnsQuery,
  ] = queries;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Executive Dashboard
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="POs Pending Approval"
          value={posQuery.data}
          color="text-yellow-600"
          isLoading={posQuery.isLoading}
          isError={posQuery.isError}
        />

        <DashboardCard
          title="LCs Expiring (30 days)"
          value={lcsQuery.data}
          color="text-red-600"
          isLoading={lcsQuery.isLoading}
          isError={lcsQuery.isError}
        />

        <DashboardCard
          title="Shipments at Customs"
          value={shipmentsQuery.data}
          color="text-blue-600"
          isLoading={shipmentsQuery.isLoading}
          isError={shipmentsQuery.isError}
        />

        <DashboardCard
          title="Registers Pending Finalisation"
          value={costRegistersQuery.data}
          color="text-purple-600"
          isLoading={costRegistersQuery.isLoading}
          isError={costRegistersQuery.isError}
        />

        <DashboardCard
          title="Variances Pending"
          value={variancesQuery.data}
          color="text-orange-600"
          isLoading={variancesQuery.isLoading}
          isError={variancesQuery.isError}
        />

        <DashboardCard
          title="GRNs Posting Failed"
          value={grnsQuery.data}
          color="text-red-600"
          isLoading={grnsQuery.isLoading}
          isError={grnsQuery.isError}
        />
      </div>
    </div>
  );
}
