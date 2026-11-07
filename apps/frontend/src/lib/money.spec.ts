import { describe, expect, it } from 'vitest';
import { formatAmount4, formatMoney, formatUnitCost, formatFx } from './money';

describe('money formatting utilities', () => {
  it('formats monetary amounts to exactly four decimal places', () => {
    expect(formatAmount4('1200')).toBe('1,200.0000');
    expect(formatAmount4('1.23456')).toBe('1.2346');
  });

  describe('formatMoney', () => {
    it('formats a number to 4 decimal places with ETB by default', () => {
      expect(formatMoney(1234.56)).toBe('ETB 1,234.5600');
    });

    it('formats a string number to 4 decimal places', () => {
      expect(formatMoney('100.1')).toBe('ETB 100.1000');
    });

    it('formats with a custom currency', () => {
      expect(formatMoney(1000, 'USD')).toBe('USD 1,000.0000');
    });
  });

  describe('formatUnitCost', () => {
    it('formats a unit cost to 4 decimal places with ETB by default', () => {
      expect(formatUnitCost(1.2345678)).toBe('ETB 1.2346');
    });

    it('formats with a custom currency', () => {
      expect(formatUnitCost('0.5', 'EUR')).toBe('EUR 0.5000');
    });
  });

  describe('formatFx', () => {
    it('formats an exchange rate to 6 decimal places', () => {
      expect(formatFx(123.456)).toBe('123.456000');
    });

    it('handles string inputs', () => {
      expect(formatFx('1.00')).toBe('1.000000');
    });
  });
});
