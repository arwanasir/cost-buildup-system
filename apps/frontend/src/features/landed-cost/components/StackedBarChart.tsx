import React from 'react';
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

export function StackedBarChart({ data }: { data: LandedCostResult[] }) {
  if (!data || data.length === 0) return null;

  // Find max total to normalize the width of bars if we want them relative to the largest item
  // OR we can make each bar 100% wide representing the composition of that specific item.
  // A composition stacked bar (100% width) is usually better to compare ratios!

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs font-medium text-gray-600 mb-4 border-b pb-4">
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.ci }}
          ></span>{' '}
          CI Value
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.duty }}
          ></span>{' '}
          Duty
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.vat }}
          ></span>{' '}
          VAT
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.freight }}
          ></span>{' '}
          Freight
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.insurance }}
          ></span>{' '}
          Insurance
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.bank }}
          ></span>{' '}
          Bank
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.port }}
          ></span>{' '}
          Port
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.clearing }}
          ></span>{' '}
          Clearing
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.other }}
          ></span>{' '}
          Other
        </div>
      </div>

      {/* Bars */}
      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
        {data.map((item) => {
          const total = parseFloat(item.totalLandedCostEtb);
          if (total === 0) return null;

          const getPct = (val: string) => (parseFloat(val) / total) * 100;

          const ciPct = getPct(item.ciValueEtb);
          const dutyPct = getPct(item.customsDutyEtb);
          const vatPct = getPct(item.importVatEtb);
          const freightPct = getPct(item.freightAllocatedEtb);
          const insPct = getPct(item.insuranceAllocatedEtb);
          const bankPct = getPct(item.bankChargesAllocatedEtb);
          const portPct = getPct(item.portChargesAllocatedEtb);
          const clearingPct = getPct(item.clearingFeeAllocatedEtb);
          const otherPct = getPct(item.otherChargesAllocatedEtb);

          return (
            <div key={item.id} className="group">
              <div className="flex justify-between text-xs mb-1">
                <span
                  className="font-semibold text-gray-700 truncate w-48"
                  title={item.itemId}
                >
                  {item.itemId}
                </span>
                <span className="font-bold text-gray-900">
                  ETB{' '}
                  {total.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="w-full h-6 bg-gray-100 rounded-sm overflow-hidden flex border border-gray-200 shadow-inner">
                {ciPct > 0 && (
                  <div
                    style={{ width: `${ciPct}%`, backgroundColor: COLORS.ci }}
                    title={`CI: ${ciPct.toFixed(1)}%`}
                  />
                )}
                {dutyPct > 0 && (
                  <div
                    style={{
                      width: `${dutyPct}%`,
                      backgroundColor: COLORS.duty,
                    }}
                    title={`Duty: ${dutyPct.toFixed(1)}%`}
                  />
                )}
                {vatPct > 0 && (
                  <div
                    style={{ width: `${vatPct}%`, backgroundColor: COLORS.vat }}
                    title={`VAT: ${vatPct.toFixed(1)}%`}
                  />
                )}
                {freightPct > 0 && (
                  <div
                    style={{
                      width: `${freightPct}%`,
                      backgroundColor: COLORS.freight,
                    }}
                    title={`Freight: ${freightPct.toFixed(1)}%`}
                  />
                )}
                {insPct > 0 && (
                  <div
                    style={{
                      width: `${insPct}%`,
                      backgroundColor: COLORS.insurance,
                    }}
                    title={`Insurance: ${insPct.toFixed(1)}%`}
                  />
                )}
                {bankPct > 0 && (
                  <div
                    style={{
                      width: `${bankPct}%`,
                      backgroundColor: COLORS.bank,
                    }}
                    title={`Bank: ${bankPct.toFixed(1)}%`}
                  />
                )}
                {portPct > 0 && (
                  <div
                    style={{
                      width: `${portPct}%`,
                      backgroundColor: COLORS.port,
                    }}
                    title={`Port: ${portPct.toFixed(1)}%`}
                  />
                )}
                {clearingPct > 0 && (
                  <div
                    style={{
                      width: `${clearingPct}%`,
                      backgroundColor: COLORS.clearing,
                    }}
                    title={`Clearing: ${clearingPct.toFixed(1)}%`}
                  />
                )}
                {otherPct > 0 && (
                  <div
                    style={{
                      width: `${otherPct}%`,
                      backgroundColor: COLORS.other,
                    }}
                    title={`Other: ${otherPct.toFixed(1)}%`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
