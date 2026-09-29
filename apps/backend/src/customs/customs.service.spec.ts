import { Test, TestingModule } from '@nestjs/testing';
import { CustomsService } from './customs.service';
import { DutyCalculatorService } from './duty-calculator.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { BadRequestException } from '@nestjs/common';

describe('CustomsService', () => {
  let service: CustomsService;
  let mockTx: any;
  let mockDb: any;
  let eventEmitterEmitMock: jest.Mock;
  let valuesMock: jest.Mock;
  let updateSetMock: jest.Mock;
  let updateWhereMock: jest.Mock;
  let deleteWhereMock: jest.Mock;

  // Storage for our dynamic query results
  let mockDeclarationData: any;
  let mockItemsData: any[];
  let mockCategoriesData: any[];

  beforeEach(async () => {
    valuesMock = jest.fn().mockResolvedValue([{ id: 'new-id' }]);
    updateWhereMock = jest.fn().mockResolvedValue([{ id: 'updated-id' }]);
    updateSetMock = jest.fn().mockReturnValue({ where: updateWhereMock });
    updateWhereMock.mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'updated-id' }]),
    }); // for returning()

    deleteWhereMock = jest.fn().mockResolvedValue(true);
    eventEmitterEmitMock = jest.fn();

    // Default mock data
    mockDeclarationData = {
      id: 'decl-1',
      status: 'draft',
      shipmentId: 'shp-1',
    };
    mockItemsData = [
      {
        id: 'item-1',
        shipmentItemId: 'si-1',
        dutyEtb: '100',
        vatEtb: '150',
        exciseEtb: '0',
        withholdingEtb: '0',
      },
    ];
    mockCategoriesData = [
      { id: 'cat-duty', code: 'DUTY' },
      { id: 'cat-vat', code: 'VAT' },
      { id: 'cat-other', code: 'OTHER' },
    ];

    const fromMock = jest.fn((table) => {
      if (table === schema.customsDeclarations) {
        return { where: jest.fn().mockResolvedValue([mockDeclarationData]) };
      } else if (table === schema.customsDeclarationItems) {
        return { where: jest.fn().mockResolvedValue(mockItemsData) };
      }
      return { where: jest.fn().mockResolvedValue([]) };
    });

    const selectMock = jest.fn().mockReturnValue({ from: fromMock });

    mockTx = {
      select: selectMock,
      query: {
        customsDeclarations: {
          findFirst: jest
            .fn()
            .mockImplementation(() => Promise.resolve(mockDeclarationData)),
        },
        costCategories: {
          findMany: jest
            .fn()
            .mockImplementation(() => Promise.resolve(mockCategoriesData)),
        },
      },
      insert: jest.fn(() => ({ values: valuesMock })),
      delete: jest.fn(() => ({ where: deleteWhereMock })),
      update: jest.fn(() => ({ set: updateSetMock })),
    };

    mockDb = {
      transaction: jest.fn((cb) => cb(mockTx)),
      select: selectMock,
      update: mockTx.update,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomsService,
        {
          provide: DutyCalculatorService,
          useValue: { computeItemCif: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: eventEmitterEmitMock },
        },
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<CustomsService>(CustomsService);
  });

  describe('assessDeclaration()', () => {
    it('assess creates item-specific entries never allocated', async () => {
      await service.assessDeclaration('decl-1', 'user-1');

      // Verify that delete was called to clear old entries
      expect(mockTx.delete).toHaveBeenCalledWith(schema.importCostEntries);

      // Verify that insert was called with the correct mapped values
      expect(mockTx.insert).toHaveBeenCalledWith(schema.importCostEntries);
      const insertedValues = valuesMock.mock.calls[0][0]; // First argument of first call to values()

      // We expect 2 entries for our mock item (dutyEtb=100, vatEtb=150)
      expect(insertedValues.length).toBe(2);

      const dutyEntry = insertedValues.find(
        (v: any) => v.costCategoryId === 'cat-duty',
      );
      const vatEntry = insertedValues.find(
        (v: any) => v.costCategoryId === 'cat-vat',
      );

      expect(dutyEntry).toBeDefined();
      expect(dutyEntry.amountEtb).toBe('100');
      expect(dutyEntry.isItemSpecific).toBe(true);
      expect(dutyEntry.allocationMethod).toBe('item_specific');
      expect(dutyEntry.source).toBe('customs');
      expect(dutyEntry.shipmentItemId).toBe('si-1');

      expect(vatEntry).toBeDefined();
      expect(vatEntry.amountEtb).toBe('150');
      expect(vatEntry.isItemSpecific).toBe(true);
      expect(vatEntry.allocationMethod).toBe('item_specific');
      expect(vatEntry.source).toBe('customs');
      expect(vatEntry.shipmentItemId).toBe('si-1');

      // Verify declaration status update
      expect(mockTx.update).toHaveBeenCalledWith(schema.customsDeclarations);
      expect(updateSetMock).toHaveBeenCalledWith({ status: 'assessed' });
    });
  });

  describe('releaseDeclaration()', () => {
    it('release blocked before payment', async () => {
      // Setup draft status (not paid)
      mockDeclarationData = {
        id: 'decl-1',
        status: 'draft',
        shipmentId: 'shp-1',
      };

      await expect(
        service.releaseDeclaration(
          'decl-1',
          { releaseDate: '2026-09-24', releaseReference: 'REL-001' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);

      // Ensure no updates or events emitted
      expect(mockTx.update).not.toHaveBeenCalled();
      expect(eventEmitterEmitMock).not.toHaveBeenCalled();
    });

    it('release moves shipment to cleared', async () => {
      // Setup paid status
      mockDeclarationData = {
        id: 'decl-1',
        status: 'paid',
        shipmentId: 'shp-1',
      };

      await service.releaseDeclaration(
        'decl-1',
        {
          releaseDate: '2026-09-24',
          releaseReference: 'REL-001',
          customsOfficer: 'Officer John',
        },
        'user-1',
      );

      // Verify declaration status update
      expect(mockTx.update).toHaveBeenCalledWith(schema.customsDeclarations);
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'released',
          releaseDate: '2026-09-24',
          releaseReference: 'REL-001',
          customsOfficer: 'Officer John',
        }),
      );

      // Verify shipment status update
      expect(mockTx.update).toHaveBeenCalledWith(schema.importShipments);
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cleared',
          customsReleaseDate: '2026-09-24',
          customsReleaseRef: 'REL-001',
        }),
      );

      // Verify event emission
      expect(eventEmitterEmitMock).toHaveBeenCalledWith('customs.released', {
        declarationId: 'decl-1',
        shipmentId: 'shp-1',
        releaseDate: '2026-09-24',
        releaseReference: 'REL-001',
      });
    });
  });
});
