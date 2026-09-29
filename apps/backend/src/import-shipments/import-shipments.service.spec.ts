import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImportShipmentsService } from './import-shipments.service';
import { ShipmentStatusService } from './shipment-status.service';
import { ShipmentQuantityService } from './shipment-quantity.service';
import { NumberingService } from '@/core/numbering/numbering.service';
import { DRIZZLE } from '@/db';

describe('Import Shipments Services', () => {
  let shipmentsService: ImportShipmentsService;
  let statusService: ShipmentStatusService;
  let quantityService: ShipmentQuantityService;

  let valuesMock: jest.Mock;
  let updateSetMock: jest.Mock;

  let mockTx: any;
  let mockDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    valuesMock = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'mock-returned-id' }]),
    });

    updateSetMock = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'mock-returned-id' }]),
      }),
    });

    mockTx = {
      query: {
        importPurchaseOrders: { findFirst: jest.fn() },
        poLines: { findMany: jest.fn() },
        costCategories: { findFirst: jest.fn(), findMany: jest.fn() },
        users: { findFirst: jest.fn() },
        importShipments: { findFirst: jest.fn() },
      },
      insert: jest.fn(() => ({ values: valuesMock })),
      update: jest.fn(() => ({ set: updateSetMock })),
    };

    mockDb = {
      transaction: jest.fn((cb) => cb(mockTx)),
      query: mockTx.query,
      insert: mockTx.insert,
      update: mockTx.update,
    };

    const mockEventEmitter = { emit: jest.fn() };
    const mockNumberingService = {
      generateNextNumber: jest.fn().mockResolvedValue('SHP-001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportShipmentsService,
        ShipmentStatusService,
        ShipmentQuantityService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: NumberingService, useValue: mockNumberingService },
      ],
    }).compile();

    shipmentsService = module.get<ImportShipmentsService>(
      ImportShipmentsService,
    );
    statusService = module.get<ShipmentStatusService>(ShipmentStatusService);
    quantityService = module.get<ShipmentQuantityService>(
      ShipmentQuantityService,
    );
  });

  describe('PO Validation & Initialization', () => {
    it('should throw BadRequestException if PO is not approved or lc_applied', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        status: 'draft',
      });

      await expect(
        shipmentsService.create({ poId: 'po-1', items: [] } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Quantity Flags & Estimated Entries', () => {
    it('should calculate quantity flags and create estimated cost entries', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValue({
        id: 'po-1',
        status: 'approved',
        fxRate: '100',
        supplierId: 'sup-1',
        estimatedFreightEtb: '1000',
        estimatedInsuranceEtb: '500',
        estimatedOtherEtb: '200',
      });
      mockTx.query.poLines.findMany.mockResolvedValue([
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: '100',
          shippedQuantity: '50',
          unitPrice: '10',
        },
      ]);
      mockTx.query.users.findFirst.mockResolvedValue({
        id: 'user-1',
        role: 'procurement_manager',
      });
      mockTx.query.costCategories.findFirst.mockResolvedValue({
        id: 'fob-cat',
      });
      mockTx.query.costCategories.findMany.mockResolvedValue([
        { id: 'fob-cat', code: 'FOB' },
        { id: 'freight-cat', code: 'FREIGHT' },
        { id: 'ins-cat', code: 'INSURANCE' },
      ]);

      await shipmentsService.create(
        {
          poId: 'po-1',
          allowOverShipment: true,
          items: [{ poLineId: 'line-1', shippedQuantity: 60, ciUnitPrice: 10 }], // 50 + 60 = 110 (over_shipment)
        },
        'user-1',
      );

      // 1. Verify over_shipment flag on shipment items
      const shipmentItemValues = valuesMock.mock.calls.find(
        (call) => Array.isArray(call[0]) && call[0][0]?.quantityFlag,
      );
      expect(shipmentItemValues).toBeDefined();
      expect(shipmentItemValues[0][0].quantityFlag).toBe('over_shipment');

      // 2. Verify estimated cost entries (FR-06.3)
      const costEntryValues = valuesMock.mock.calls.find(
        (call) =>
          Array.isArray(call[0]) &&
          call[0].some((c: any) => c.source === 'po_estimate'),
      );
      expect(costEntryValues).toBeDefined();

      const estimatedEntries = costEntryValues[0].filter(
        (c: any) => c.isEstimated === true && c.source === 'po_estimate',
      );
      expect(estimatedEntries.length).toBeGreaterThan(0);

      const actualFobEntry = costEntryValues[0].find(
        (c: any) => c.costCategoryId === 'fob-cat' && c.isEstimated === false,
      );
      expect(actualFobEntry).toBeDefined();
    });
  });

  describe('Status Transitions (ShipmentStatusService)', () => {
    it('should transition ordered -> shipped successfully', async () => {
      mockTx.query.importShipments.findFirst.mockResolvedValue({
        id: 'shp-1',
        status: 'ordered',
      });
      await statusService.updateStatus(
        'shp-1',
        { status: 'shipped' } as any,
        'user-1',
      );
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid transition (ordered -> cleared)', async () => {
      mockTx.query.importShipments.findFirst.mockResolvedValue({
        id: 'shp-1',
        status: 'ordered',
      });
      await expect(
        statusService.updateStatus(
          'shp-1',
          { status: 'cleared' } as any,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when transitioning to at_customs without actualArrivalDate', async () => {
      mockTx.query.importShipments.findFirst.mockResolvedValue({
        id: 'shp-1',
        status: 'shipped',
      });
      await expect(
        statusService.updateStatus(
          'shp-1',
          { status: 'at_customs' } as any,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow transition to at_customs when actualArrivalDate is provided', async () => {
      mockTx.query.importShipments.findFirst.mockResolvedValue({
        id: 'shp-1',
        status: 'shipped',
      });
      await statusService.updateStatus(
        'shp-1',
        { status: 'at_customs', actualArrivalDate: '2026-01-01' } as any,
        'user-1',
      );
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'at_customs',
          actualArrivalDate: '2026-01-01',
        }),
      );
    });
  });
});
