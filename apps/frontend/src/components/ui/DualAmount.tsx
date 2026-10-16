import { formatMoney, formatUnitCost } from '@/lib/money';

export interface DualAmountProps {
  foreignAmount?: string | number;
  foreignCurrency?: string;
  etbAmount?: string | number;
  amountForeign?: string | number;
  amountEtb?: string | number;
  currency?: string;
  type?: 'money' | 'unitCost';
  className?: string;
}

export function DualAmount({
  foreignAmount,
  foreignCurrency,
  etbAmount,
  amountForeign,
  amountEtb,
  currency,
  type = 'money',
  className = '',
}: DualAmountProps) {
  const formatter = type === 'money' ? formatMoney : formatUnitCost;
  const displayForeignAmount = foreignAmount ?? amountForeign ?? 0;
  const displayForeignCurrency = foreignCurrency ?? currency ?? 'USD';
  const displayEtbAmount = etbAmount ?? amountEtb ?? 0;

  return (
    <div className={`flex flex-col text-sm ${className}`}>
      <span className="font-medium text-gray-900">
        {formatter(displayForeignAmount, displayForeignCurrency)}
      </span>
      <span className="text-gray-500 text-xs">
        {formatter(displayEtbAmount, 'ETB')}
      </span>
    </div>
  );
}
