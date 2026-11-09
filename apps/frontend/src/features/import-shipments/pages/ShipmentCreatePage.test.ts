import { describe, expect, it } from 'vitest';
import { getShipmentEligiblePurchaseOrders } from './ShipmentCreatePage';
import type { PurchaseOrder } from '@/features/purchase-orders/api';

const po = (id: string, status: PurchaseOrder['status']) =>
  ({ id, status, poNumber: id }) as PurchaseOrder;

describe('getShipmentEligiblePurchaseOrders', () => {
  it('includes approved and LC-applied POs without duplicating records', () => {
    const approved = po('po-approved', 'approved');
    const lcApplied = po('po-lc', 'lc_applied');

    expect(
      getShipmentEligiblePurchaseOrders([approved], [lcApplied, approved]),
    ).toEqual([approved, lcApplied]);
  });

  it('returns no POs when neither eligible status has results', () => {
    expect(getShipmentEligiblePurchaseOrders([], [])).toEqual([]);
  });
});
