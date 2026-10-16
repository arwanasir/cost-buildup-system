import { describe, expect, it } from 'vitest';
import { formatMoney, formatUnitCost, formatFx } from './money';

describe('money formatting utilities', () => {
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
    it('formats a number to 6 decimal places with ETB by default', () => {
      expect(formatUnitCost(1.2345678)).toBe('ETB 1.234568');
    });

    it('formats with a custom currency', () => {
      expect(formatUnitCost('0.5', 'EUR')).toBe('EUR 0.500000');
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
