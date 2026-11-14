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
    ? 'group block min-h-36 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition'
    : `group block min-h-36 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,.035)] transition duration-150 ${to ? 'hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600' : ''}`;
  const content = isError ? (
    <>
      <div className="mb-5 h-1 w-9 rounded-full bg-rose-400" />
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-3 text-sm text-red-600">
        <LocalizedText text={'Error loading data'} />
      </p>
    </>
  ) : (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <span className="h-1 w-9 rounded-full bg-sky-500" />
        {to && (
          <span
            aria-hidden="true"
            className="text-sm text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-700"
          >
            ↗
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium leading-5 text-gray-500">{title}</h3>
      <p
        className={`mt-2 text-[32px] font-bold leading-none tracking-tight ${color}`}
      >
        {value}
      </p>
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
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canReadPurchaseOrders = hasPermission('po:read');
  const canReadLettersOfCredit = hasPermission('lc:read');
  const canReadShipments = hasPermission('shipment:read');
  const canReadCosts = hasPermission('cost:read');
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

  const [variancesQuery, grnsQuery] = queries;

  return (
    <div className="space-y-7">
      <section className="workflow-hero relative overflow-hidden rounded-3xl bg-[#14243a] px-6 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[38px] border-sky-400/10" />
        <div className="pointer-events-none absolute -bottom-28 right-32 h-56 w-56 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">
            {localize('Import operations')}
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            <LocalizedText text={'Workflow Overview'} />
          </h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            {localize('Welcome')},{' '}
            {user?.fullName?.trim() || user?.email || localize('User')}.{' '}
            {localize('Monitor imports from purchase order to goods receipt.')}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-200 sm:gap-3">
            {[
              'Purchase order',
              'Letter of credit',
              'Shipment',
              'Customs',
              'Landed cost',
              'Goods receipt',
            ].map((step, index) => (
              <span key={step} className="inline-flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-sky-300/30 bg-sky-300/10 text-[10px] text-sky-200">
                  {index + 1}
                </span>
                <span className="hidden sm:inline">{localize(step)}</span>
                {index < 5 && (
                  <span className="hidden text-slate-500 sm:inline">›</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {localize('Operations at a glance')}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {localize('Current workload and items that may need attention.')}
          </p>
        </div>
        <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">
          ● {localize('Live overview')}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          value={summary?.shipmentsAtCustoms ?? 0}
          color="text-blue-600"
          to={canReadShipments ? '/shipments' : undefined}
          isLoading={summaryLoading}
          isError={summaryError}
        />

        <DashboardCard
          title={localize('Registers Pending Finalisation')}
          value={summary?.registersPendingFinalisation ?? 0}
          color="text-purple-600"
          to={canReadCosts ? '/landed-cost' : undefined}
          isLoading={summaryLoading}
          isError={summaryError}
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
