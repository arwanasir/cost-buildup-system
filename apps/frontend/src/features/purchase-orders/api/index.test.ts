import { describe, expect, it } from 'vitest';
import { normalizePurchaseOrder } from './index';

describe('normalizePurchaseOrder', () => {
  it('maps the backend value fields to the amounts used by the UI', () => {
    const po = normalizePurchaseOrder({
      id: 'po-1',
      totalValueForeign: '15000.0000',
      totalValueEtb: '15000.0000',
      suppliers: { id: 'supplier-1', name: 'Example Supplier' },
      lc: { id: 'lc-1' },
    });

    expect(po.totalAmount).toBe('15000.0000');
    expect(po.totalAmountEtb).toBe('15000.0000');
    expect(po.supplier?.name).toBe('Example Supplier');
    expect(po.lettersOfCredit).toEqual([{ id: 'lc-1' }]);
  });

  it('preserves legacy amount fields when they are present', () => {
    const po = normalizePurchaseOrder({
      id: 'po-2',
      totalAmount: '900',
      totalAmountEtb: '90000',
      totalValueForeign: '1000',
      totalValueEtb: '100000',
    });

    expect(po.totalAmount).toBe('900');
    expect(po.totalAmountEtb).toBe('90000');
  });
});
