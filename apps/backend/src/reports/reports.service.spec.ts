import { ReportsService } from './reports.service';

describe('ReportsService by-item report serialization', () => {
  it('returns a JSON-safe numeric quantity without Decimal internals', async () => {
    const resultRows = [
      {
        shipmentId: 'shipment-1',
        shipmentNumber: 'SHP-00001',
        shipmentDate: '2026-11-01T00:00:00.000Z',
        supplierId: 'supplier-1',
        itemId: 'item-1',
        itemName: 'Demo item',
        hsCode: '1234.56',
        quantity: '49.0000',
        perUnitLandedCostEtb: '102.0408',
        totalLandedCostEtb: '5000.0000',
        ciValueEtb: '4000.0000',
        customsDutyEtb: '100.0000',
        importVatEtb: '50.0000',
        freightAllocatedEtb: '300.0000',
        insuranceAllocatedEtb: '100.0000',
        bankChargesAllocatedEtb: '100.0000',
        portChargesAllocatedEtb: '100.0000',
        clearingFeeAllocatedEtb: '100.0000',
        otherChargesAllocatedEtb: '150.0000',
      },
    ];
    const query = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(resultRows),
    };
    const db = { select: jest.fn().mockReturnValue(query) };
    const service = new ReportsService(db as any);

    const [row] = await service.getLandedCostByItem({ item_id: 'item-1' });

    expect(row.quantity).toBe(49);
    expect(typeof row.quantity).toBe('number');
    expect(Object.keys(row)).not.toContain('quantity.s');
    expect(row.totalPerUnitCost).toBe(102.0408);
  });
});
