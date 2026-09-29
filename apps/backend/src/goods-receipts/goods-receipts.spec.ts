import { Test, TestingModule } from '@nestjs/testing';
import { GoodsReceiptsService } from './goods-receipts.service';
import { QuantityDiscrepancyService } from './quantity-discrepancy.service';
import { LandedCostService } from '@/landed-cost/landed-cost.service';
import { InventoryPostingService } from '@/erp-sync/inventory-posting.service';
import { FinancePostingService } from '@/erp-sync/finance-posting.service';
import { DRIZZLE } from '@/db';
import { BadRequestException } from '@nestjs/common';
import * as schema from '@/db/schema';
import { CreateGrnDto } from './dto/create-grn.dto';
import Decimal from 'decimal.js';

describe('Goods Receipts & Discrepancies (BR01A, FR-09.1, FR-09.2)', () => {
  let grnService: GoodsReceiptsService;
  let discrepancyService: QuantityDiscrepancyService;
  let dbMock: any;
  let whereMock: jest.Mock;

  beforeEach(async () => {
    whereMock = jest.fn();

    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: whereMock,
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnValue([{ id: 'mock-grn-123' }]),
      transaction: jest.fn(async (cb) => cb(dbMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptsService,
        QuantityDiscrepancyService,
        { provide: DRIZZLE, useValue: dbMock },
        { provide: LandedCostService, useValue: { computeDraft: jest.fn() } },
        { provide: InventoryPostingService, useValue: { post: jest.fn() } },
        {
          provide: FinancePostingService,
          useValue: { postGrnJournal: jest.fn() },
        },
      ],
    }).compile();

    grnService = module.get<GoodsReceiptsService>(GoodsReceiptsService);
    discrepancyService = module.get<QuantityDiscrepancyService>(
      QuantityDiscrepancyService,
    );
  });

  it('should block GRN creation if shipment has no customs release (BR01A)', async () => {
    whereMock.mockResolvedValueOnce([{ status: 'shipped' }]); // Shipment status

    const dto = {
      shipmentId: 'ship-123',
      receiptDate: '2026-10-01',
      warehouseLocation: 'Main',
      items: [],
    } as any;

    await expect(grnService.createGrn(dto, 'user-1')).rejects.toThrow(
      new BadRequestException(
        "BR01A: Cannot receive goods. Shipment status 'shipped' does not indicate customs release.",
      ),
    );
  });

  it('should block if accepted + rejected !== received quantity (FR-09.2)', async () => {
    whereMock
      .mockResolvedValueOnce([{ status: 'cleared', poId: 'po-123' }]) // Shipment
      .mockResolvedValueOnce([]) // Policy settings
      .mockResolvedValueOnce([]); // Shipment Items (No unacknowledged variance)

    const dto = {
      shipmentId: 'ship-123',
      receiptDate: '2026-10-01',
      warehouseLocation: 'Main',
      items: [
        {
          shipmentItemId: 'item-1',
          receivedQuantity: 100,
          acceptedQuantity: 90,
          rejectedQuantity: 5, // 90 + 5 = 95 != 100
          inspectionResult: 'partial',
        },
      ],
    } as any;

    await expect(grnService.createGrn(dto, 'user-1')).rejects.toThrow(
      new BadRequestException(
        'FR-09.2: For item item-1, accepted_quantity (90) + rejected_quantity (5) must equal received_quantity (100).',
      ),
    );
  });

  it('should compute quantity discrepancy flags correctly (FR-09.1)', async () => {
    whereMock
      .mockResolvedValueOnce([
        { shipmentItemId: 'si-1', receivedQuantity: '110' },
        { shipmentItemId: 'si-2', receivedQuantity: '90' },
        { shipmentItemId: 'si-3', receivedQuantity: '100' },
      ]) // grnItems
      .mockResolvedValueOnce([
        { id: 'si-1', poLineId: 'pl-1', shippedQuantity: '100' },
        { id: 'si-2', poLineId: 'pl-2', shippedQuantity: '100' },
        { id: 'si-3', poLineId: 'pl-3', shippedQuantity: '100' },
      ]) // shipmentItems
      .mockResolvedValueOnce([
        { id: 'pl-1', quantity: '100' },
        { id: 'pl-2', quantity: '100' },
        { id: 'pl-3', quantity: '100' },
      ]); // poLines

    const results =
      await discrepancyService.analyzeAndStoreDiscrepancies('grn-123');

    expect(results).toHaveLength(3);

    const flag1 = results.find((r) => r.shipmentItemId === 'si-1')?.flag;
    expect(flag1).toBe('OVER_PO'); // 110 > 100

    const flag2 = results.find((r) => r.shipmentItemId === 'si-2')?.flag;
    expect(flag2).toBe('SHORT_PO'); // 90 < 100

    const flag3 = results.find((r) => r.shipmentItemId === 'si-3')?.flag;
    expect(flag3).toBe('EXACT_MATCH'); // 100 == 100
  });

  it('should evaluate shipped vs received flags if PO matched but shipped differed (FR-09.1)', async () => {
    whereMock
      .mockResolvedValueOnce([
        { shipmentItemId: 'si-4', receivedQuantity: '100' },
      ]) // grnItems
      .mockResolvedValueOnce([
        { id: 'si-4', poLineId: 'pl-4', shippedQuantity: '90' }, // BL shipped short
      ]) // shipmentItems
      .mockResolvedValueOnce([{ id: 'pl-4', quantity: '100' }]); // poLines

    const results =
      await discrepancyService.analyzeAndStoreDiscrepancies('grn-123');

    // Received (100) == PO (100), but Received (100) > Shipped (90)
    // Actually in the code: PO is checked first. received == poQty -> checks shipped. received > shipped -> OVER_SHIPPED.
    expect(results[0].flag).toBe('OVER_SHIPPED');
  });
});
