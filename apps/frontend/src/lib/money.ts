import Decimal from 'decimal.js';

export function formatAmount4(amount: string | number | Decimal): string {
  const dec = new Decimal(amount);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(dec.toNumber());
}

export function formatMoney(
  amount: string | number | Decimal,
  currency: string = 'ETB',
): string {
  const dec = new Decimal(amount);

  // Format with Intl.NumberFormat for thousands separators
  return `${currency} ${formatAmount4(dec)}`;
}

export function formatUnitCost(
  amount: string | number | Decimal,
  currency: string = 'ETB',
): string {
  const dec = new Decimal(amount);

  return `${currency} ${formatAmount4(dec)}`;
}

export function formatFx(rate: string | number | Decimal): string {
  const dec = new Decimal(rate);

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });

  return formatter.format(dec.toNumber());
}
