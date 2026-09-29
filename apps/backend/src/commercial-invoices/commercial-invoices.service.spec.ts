import { Test, TestingModule } from '@nestjs/testing';
import { CommercialInvoicesService } from './commercial-invoices.service';
import { DRIZZLE } from '@/db';

describe('CommercialInvoicesService', () => {
  let service: CommercialInvoicesService;
  let mockTx: any;
  let mockDb: any;
  let valuesMock: jest.Mock;
  let deleteWhereMock: jest.Mock;
  let updateSetMock: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    valuesMock = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'ci-1' }]),
    });
    deleteWhereMock = jest.fn().mockResolvedValue(true);
    updateSetMock = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 'ci-1', acknowledgedAt: new Date().toISOString() },
          ]),
      }),
    });

    mockTx = {
      query: {
        importShipments: { findFirst: jest.fn() },
        shipmentItems: { findMany: jest.fn() },
        poLines: { findMany: jest.fn() },
        costCategories: { findFirst: jest.fn() },
        policySettings: { findFirst: jest.fn() },
        users: { findMany: jest.fn() },
      },
      insert: jest.fn(() => ({ values: valuesMock })),
      delete: jest.fn(() => ({ where: deleteWhereMock })),
      update: jest.fn(() => ({ set: updateSetMock })),
    };

    mockDb = {
      transaction: jest.fn((cb) => cb(mockTx)),
      update: mockTx.update,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommercialInvoicesService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<CommercialInvoicesService>(CommercialInvoicesService);
  });

  const setupMockData = () => {
    mockTx.query.importShipments.findFirst.mockResolvedValue({
      id: 'shp-1',
      supplierId: 'sup-1',
    });
    // PO Line expected = 100 qty * $10 = $1000
    mockTx.query.poLines.findMany.mockResolvedValue([
      { id: 'line-1', unitPrice: '10' },
    ]);
    mockTx.query.shipmentItems.findMany.mockResolvedValue([
      { id: 'item-1', poLineId: 'line-1', shippedQuantity: '100' },
    ]);
    mockTx.query.costCategories.findFirst.mockResolvedValue({
      id: 'fob-cat',
      code: 'FOB',
    });
    // Policy threshold is 5%
    mockTx.query.policySettings.findFirst.mockResolvedValue({
      key: 'ci_price_variance_pct',
      valueNumeric: '5',
    });
    mockTx.query.users.findMany.mockResolvedValue([{ id: 'mgr-1' }]);
  };

  describe('create() BR11 & Actual Costs', () => {
    it('should replace estimated FOB cost entries with actuals and auto-acknowledge a 4% variance', async () => {
      setupMockData();

      const dto = {
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-01-01',
        currency: 'USD',
        fxRate: 120, // To ETB
        items: [{ shipmentItemId: 'item-1', ciUnitPrice: 10.4 }], // $1040 total. Variance = (1040-1000)/1000 = 4%
      };

      await service.create('shp-1', dto);

      // 1. Verify FOB entries were deleted
      expect(mockTx.delete).toHaveBeenCalled();

      // 2. Verify new actual entries inserted
      const costEntryCall = valuesMock.mock.calls.find(
        (call) =>
          Array.isArray(call[0]) && call[0][0]?.source === 'commercial_invoice',
      );
      expect(costEntryCall).toBeDefined();
      const actualFobEntry = costEntryCall[0][0];
      expect(actualFobEntry.isEstimated).toBe(false); // Replaced with actual
      expect(actualFobEntry.costCategoryId).toBe('fob-cat');

      // Calculate Expected ETB = 1040 * 120 = 124800
      expect(actualFobEntry.amountEtb).toBe('124800');

      // 3. Verify BR11 - 4% is under 5% threshold
      const ciHeaderCall = valuesMock.mock.calls.find(
        (call) =>
          !Array.isArray(call[0]) && call[0]?.invoiceNumber === 'INV-001',
      );
      expect(ciHeaderCall).toBeDefined();
      const ciHeader = ciHeaderCall[0];
      expect(ciHeader.priceVariancePct).toBe('4');
      expect(ciHeader.acknowledgedAt).not.toBeNull(); // Auto-acknowledged

      // 4. Verify no notifications fired
      const notificationCall = valuesMock.mock.calls.find(
        (call) =>
          Array.isArray(call[0]) && call[0][0]?.type === 'approval_request',
      );
      expect(notificationCall).toBeUndefined();
    });

    it('should block GRN (null acknowledge) and fire BR11 alert for a 6% variance', async () => {
      setupMockData();

      const dto = {
        invoiceNumber: 'INV-002',
        invoiceDate: '2026-01-01',
        currency: 'USD',
        fxRate: 120,
        items: [{ shipmentItemId: 'item-1', ciUnitPrice: 10.6 }], // $1060 total. Variance = (1060-1000)/1000 = 6%
      };

      await service.create('shp-1', dto);

      // 1. Verify BR11 - 6% exceeds 5% threshold
      const ciHeaderCall = valuesMock.mock.calls.find(
        (call) =>
          !Array.isArray(call[0]) && call[0]?.invoiceNumber === 'INV-002',
      );
      expect(ciHeaderCall).toBeDefined();
      expect(ciHeaderCall[0].priceVariancePct).toBe('6');
      expect(ciHeaderCall[0].acknowledgedAt).toBeNull(); // GRN BLOCKED

      // 2. Verify notifications fired
      const notificationCall = valuesMock.mock.calls.find(
        (call) =>
          Array.isArray(call[0]) && call[0][0]?.type === 'approval_request',
      );
      expect(notificationCall).toBeDefined();
      expect(notificationCall[0][0].userId).toBe('mgr-1');
    });
  });

  describe('acknowledgeVariance()', () => {
    it('should set acknowledgedAt and clear the GRN block', async () => {
      await service.acknowledgeVariance('ci-1', 'mgr-1');

      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          varianceAcknowledgedBy: 'mgr-1',
        }),
      );
      // Check that acknowledgedAt was set
      const setCallArg = updateSetMock.mock.calls[0][0];
      expect(setCallArg.acknowledgedAt).toBeDefined();
      expect(setCallArg.acknowledgedAt).not.toBeNull();
    });
  });
});
