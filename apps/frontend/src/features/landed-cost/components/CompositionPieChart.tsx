import React, { useMemo } from 'react';
import { type LandedCostResult } from '../api';

const COLORS = {
  ci: '#94a3b8',
  duty: '#f87171',
  vat: '#fb923c',
  freight: '#60a5fa',
  insurance: '#34d399',
  bank: '#a78bfa',
  port: '#f472b6',
  clearing: '#fbbf24',
  other: '#9ca3af',
};

export function CompositionPieChart({ data }: { data: LandedCostResult[] }) {
  const totals = useMemo(() => {
    let ci = 0,
      duty = 0,
      vat = 0,
      freight = 0,
      insurance = 0,
      bank = 0,
      port = 0,
      clearing = 0,
      other = 0,
      grandTotal = 0;

    data.forEach((item) => {
      ci += parseFloat(item.ciValueEtb);
      duty += parseFloat(item.customsDutyEtb);
      vat += parseFloat(item.importVatEtb);
      freight += parseFloat(item.freightAllocatedEtb);
      insurance += parseFloat(item.insuranceAllocatedEtb);
      bank += parseFloat(item.bankChargesAllocatedEtb);
      port += parseFloat(item.portChargesAllocatedEtb);
      clearing += parseFloat(item.clearingFeeAllocatedEtb);
      other += parseFloat(item.otherChargesAllocatedEtb);
      grandTotal += parseFloat(item.totalLandedCostEtb);
    });

    return {
      ci,
      duty,
      vat,
      freight,
      insurance,
      bank,
      port,
      clearing,
      other,
      grandTotal,
    };
  }, [data]);

  if (totals.grandTotal === 0) return null;

  // Compute conic gradient stops
  const getStop = (val: number, currentAcc: number) => {
    const pct = (val / totals.grandTotal) * 100;
    return pct;
  };

  let acc = 0;
  const stops: string[] = [];

  const addStop = (val: number, color: string) => {
    if (val <= 0) return;
    const pct = (val / totals.grandTotal) * 100;
    stops.push(`${color} ${acc}% ${acc + pct}%`);
    acc += pct;
  };

  addStop(totals.ci, COLORS.ci);
  addStop(totals.duty, COLORS.duty);
  addStop(totals.vat, COLORS.vat);
  addStop(totals.freight, COLORS.freight);
  addStop(totals.insurance, COLORS.insurance);
  addStop(totals.bank, COLORS.bank);
  addStop(totals.port, COLORS.port);
  addStop(totals.clearing, COLORS.clearing);
  addStop(totals.other, COLORS.other);

  const gradient = `conic-gradient(${stops.join(', ')})`;

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-48 h-48 rounded-full shadow-lg border-4 border-white"
        style={{ background: gradient }}
      />
      <div className="mt-8 w-full max-w-xs space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 font-medium flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.ci }}
            ></span>{' '}
            CI Base
          </span>{' '}
          <span>{((totals.ci / totals.grandTotal) * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 font-medium flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.duty }}
            ></span>{' '}
            Duty
          </span>{' '}
          <span>{((totals.duty / totals.grandTotal) * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 font-medium flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.vat }}
            ></span>{' '}
            VAT
          </span>{' '}
          <span>{((totals.vat / totals.grandTotal) * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 font-medium flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.freight }}
            ></span>{' '}
            Freight
          </span>{' '}
          <span>
            {((totals.freight / totals.grandTotal) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 font-medium flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.clearing }}
            ></span>{' '}
            Clearing & Port
          </span>{' '}
          <span>
            {(
              ((totals.clearing + totals.port) / totals.grandTotal) *
              100
            ).toFixed(1)}
            %
          </span>
        </div>
      </div>
    </div>
  );
}
