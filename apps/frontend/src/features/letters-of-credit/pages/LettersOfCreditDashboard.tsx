import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { useLettersOfCredit, type LetterOfCredit } from '../api';
import {
  Button,
  Table,
  Badge,
  Skeleton,
  ErrorState,
  DualAmount,
} from '@/components/ui';

export function LettersOfCreditDashboard() {
  const { data, isLoading, isError, refetch } = useLettersOfCredit();

  const lcs = data?.data || [];

  // Derive counts
  const counts = useMemo(() => {
    return lcs.reduce(
      (acc, lc) => {
        acc[lc.status] = (acc[lc.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [lcs]);

  const renderDaysBadge = (dateString: string | null) => {
    if (!dateString) return <span className="text-gray-400">-</span>;
    const days = differenceInDays(new Date(dateString), new Date());

    if (days < 0) return <Badge variant="danger">Expired</Badge>;
    if (days <= 7) return <Badge variant="danger">{days}d left</Badge>;
    if (days <= 30) return <Badge variant="warning">{days}d left</Badge>;
    return <Badge variant="success">{days}d left</Badge>;
  };

  const columns = [
    {
      header: 'LC Number',
      accessor: (row: LetterOfCredit) => (
        <Link
          to={`/letters-of-credit/${row.id}`}
          className="font-mono text-blue-600 hover:underline font-semibold"
        >
          {row.lcNumber || 'DRAFT'}
        </Link>
      ),
    },
    {
      header: 'Supplier',
      accessor: (row: LetterOfCredit) => row.supplier?.name || '-',
    },
    {
      header: 'Linked POs',
      accessor: (row: LetterOfCredit) => (
        <div className="flex gap-1 flex-wrap max-w-[150px]">
          {row.pos && row.pos.length > 0 ? (
            row.pos.map((po, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200 font-mono"
              >
                {po.poNumber}
              </span>
            ))
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      header: 'Issuing Bank',
      accessor: (row: LetterOfCredit) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{row.issuingBank}</p>
          {row.advisingBank && (
            <p className="text-xs text-gray-500">Adv: {row.advisingBank}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (row: LetterOfCredit) => (
        <DualAmount
          amountForeign={row.amountForeign}
          amountEtb={row.amountEtb}
          currency={row.currency}
        />
      ),
    },
    {
      header: 'Expiry Date',
      accessor: (row: LetterOfCredit) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm whitespace-nowrap">
            {new Date(row.expiryDate).toLocaleDateString()}
          </span>
          {renderDaysBadge(row.expiryDate)}
        </div>
      ),
    },
    {
      header: 'Last Shipment',
      accessor: (row: LetterOfCredit) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm whitespace-nowrap">
            {row.lastShipmentDate
              ? new Date(row.lastShipmentDate).toLocaleDateString()
              : '-'}
          </span>
          {renderDaysBadge(row.lastShipmentDate)}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: LetterOfCredit) => {
        switch (row.status) {
          case 'applied':
            return <Badge variant="secondary">Applied</Badge>;
          case 'pending_gm_approval':
            return <Badge variant="warning">Pending GM</Badge>;
          case 'approved':
            return <Badge variant="success">Approved</Badge>;
          case 'opened':
            return <Badge variant="info">Opened</Badge>;
          case 'amended':
            return <Badge variant="warning">Amended</Badge>;
          case 'closed':
            return <Badge variant="secondary">Closed</Badge>;
          default:
            return <Badge variant="secondary">{row.status}</Badge>;
        }
      },
    },
  ];

  const statCards = [
    {
      label: 'Draft / Applied',
      value: counts['applied'] || 0,
      color: 'border-l-gray-500',
    },
    {
      label: 'Pending GM',
      value: counts['pending_gm_approval'] || 0,
      color: 'border-l-amber-500',
    },
    {
      label: 'Approved',
      value: counts['approved'] || 0,
      color: 'border-l-green-500',
    },
    {
      label: 'Opened / Active',
      value: (counts['opened'] || 0) + (counts['amended'] || 0),
      color: 'border-l-blue-500',
    },
  ];

  if (isLoading) return <Skeleton className="h-[800px] w-full" />;
  if (isError)
    return (
      <ErrorState
        message="Failed to load Letters of Credit"
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Letters of Credit
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track trade finance instruments, expiry dates, and
            banking metrics.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link to="/letters-of-credit/new">
            <Button>Create LC</Button>
          </Link>
        </div>
      </div>

      {/* KPI Status Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`bg-white overflow-hidden shadow rounded-lg border border-gray-200 border-l-4 ${stat.color}`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* LC Data Grid */}
      <div className="bg-white shadow sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Active Instruments
          </h3>
        </div>
        <div className="overflow-x-auto p-4">
          <Table columns={columns} data={lcs} />
        </div>
      </div>
    </div>
  );
}
