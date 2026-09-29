import { Test, TestingModule } from '@nestjs/testing';
import { LineageService } from './lineage.service';
import { DRIZZLE } from '@/db';

describe('Lineage Tracing Service (SRS 5.3)', () => {
  let service: LineageService;
  let dbMock: any;
  let whereMock: jest.Mock;

  beforeEach(async () => {
    whereMock = jest.fn();

    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: whereMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LineageService, { provide: DRIZZLE, useValue: dbMock }],
    }).compile();

    service = module.get<LineageService>(LineageService);
  });

  it('asserts the complete vertical audit chain resolves perfectly for a posted item', async () => {
    const mockPoLine = { id: 'po-line-1', poNumber: 'PO-100' };
    const mockShipmentItem = {
      id: 'ship-item-1',
      poLineId: 'po-line-1',
      shippedQuantity: '10',
    };
    const mockAllocations = [
      { id: 'alloc-1', categoryCode: 'FREIGHT', allocatedEtb: '100' },
      { id: 'alloc-2', categoryCode: 'CUSTOMS_DUTY', allocatedEtb: '50' },
    ];
    const mockLandedCostResult = {
      id: 'lc-1',
      shipmentItemId: 'ship-item-1',
      totalLandedCostEtb: '1150',
      postedToInventory: true,
      inventoryTransactionId: 'INV-777-XYZ',
    };

    let callCount = 0;
    whereMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([mockPoLine]); // 1. PO Line fetch
      if (callCount === 2) return Promise.resolve([mockShipmentItem]); // 2. Shipment Items mapped
      if (callCount === 3) return Promise.resolve(mockAllocations); // 3. Allocations mapped
      if (callCount === 4) return Promise.resolve([mockLandedCostResult]); // 4. Landed cost mapped
      return Promise.resolve([]);
    });

    const lineage = await service.getPoLineage('po-line-1');

    // 1. PO Line verified
    expect(lineage.poLine).toBeDefined();
    expect(lineage.poLine.id).toBe('po-line-1');

    // 2. Shipment Item derived
    expect(lineage.shipmentItems).toHaveLength(1);
    const itemChain = lineage.shipmentItems[0];
    expect(itemChain.shipmentItem.id).toBe('ship-item-1');

    // 3. Cost Allocations isolated
    expect(itemChain.costAllocations).toHaveLength(2);
    expect(itemChain.costAllocations[0].allocatedEtb).toBe('100');

    // 4. Landed Cost & Inventory posting tracked successfully
    expect(itemChain.landedCostResult).toBeDefined();
    expect(itemChain.landedCostResult.totalLandedCostEtb).toBe('1150');
    expect(itemChain.landedCostResult.postedToInventory).toBe(true);
    expect(itemChain.landedCostResult.inventoryTransactionId).toBe(
      'INV-777-XYZ',
    );
  });

  it('throws NotFoundException if the root PO line is missing', async () => {
    whereMock.mockResolvedValueOnce([]); // Empty DB return

    await expect(service.getPoLineage('invalid-po-line')).rejects.toThrow(
      'PO Line invalid-po-line not found',
    );
  });
});
