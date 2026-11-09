import { useUiText } from '@/lib/ui-text';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/auth.store';

function DashboardCard({
  title,
  value,
  color,
  to,
  isLoading,
  isError,
}: {
  title: string;
  value: number | string;
  color: string;
  to?: string;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const className = isError
    ? 'block bg-white p-6 rounded-lg shadow-sm border border-red-200'
    : `block bg-white p-6 rounded-lg shadow-sm border border-gray-100 ${to ? 'transition hover:border-blue-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600' : ''}`;
  const content = isError ? (
    <>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-sm text-red-600">
        <LocalizedText text={'Error loading data'} />
      </p>
    </>
  ) : (
    <div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );

  return to ? (
    <Link to={to} aria-label={title} className={className}>
      {content}
    </Link>
  ) : (
    <div aria-label={title} className={className}>
      {content}
    </div>
  );
}

export function DashboardPage() {
  const localize = useUiText();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canReadPurchaseOrders = hasPermission('po:read');
  const canReadLettersOfCredit = hasPermission('lc:read');
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data.data || res.data;
    },
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) => (query.state.status === 'error' ? 5000 : false),
  });
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

  const [shipmentsQuery, costRegistersQuery, variancesQuery, grnsQuery] =
    queries;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          <LocalizedText text={'\n          Executive Dashboard\n        '} />
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title={localize('POs Pending Approval')}
          value={summary?.pendingPurchaseOrders ?? 0}
          color="text-yellow-600"
          to={
            canReadPurchaseOrders
              ? '/purchase-orders?status=pending_approval'
              : undefined
          }
          isLoading={summaryLoading}
          isError={summaryError}
        />

        <DashboardCard
          title={localize('LCs Expiring (30 days)')}
          value={summary?.expiringLettersOfCredit ?? 0}
          color="text-red-600"
          to={canReadLettersOfCredit ? '/letters-of-credit' : undefined}
          isLoading={summaryLoading}
          isError={summaryError}
        />

        <DashboardCard
          title={localize('Shipments at Customs')}
          value={shipmentsQuery.data}
          color="text-blue-600"
          to="/shipments"
          isLoading={shipmentsQuery.isLoading}
          isError={shipmentsQuery.isError}
        />

        <DashboardCard
          title={localize('Registers Pending Finalisation')}
          value={costRegistersQuery.data}
          color="text-purple-600"
          to="/landed-cost"
          isLoading={costRegistersQuery.isLoading}
          isError={costRegistersQuery.isError}
        />

        <DashboardCard
          title={localize('Variances Pending')}
          value={variancesQuery.data}
          color="text-orange-600"
          to="/variances"
          isLoading={variancesQuery.isLoading}
          isError={variancesQuery.isError}
        />

        <DashboardCard
          title={localize('GRNs Posting Failed')}
          value={grnsQuery.data}
          color="text-red-600"
          to="/goods-receipts"
          isLoading={grnsQuery.isLoading}
          isError={grnsQuery.isError}
        />
      </div>
    </div>
  );
}
