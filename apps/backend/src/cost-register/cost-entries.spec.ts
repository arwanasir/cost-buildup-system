import { Test, TestingModule } from '@nestjs/testing';
import { CostEntriesService } from './cost-entries.service';
import { CostSummaryService } from './cost-summary.service';
import { FxToleranceService } from './fx-tolerance.service';
import { DRIZZLE } from '@/db';
import { StorageService } from '@/storage/storage.service';
import { BadRequestException } from '@nestjs/common';
import * as schema from '@/db/schema';
import Decimal from 'decimal.js';

import { EventEmitter2 } from '@nestjs/event-emitter';

describe('CostEntries & Summary Services', () => {
  let costEntriesService: CostEntriesService;
  let costSummaryService: CostSummaryService;
  let fxToleranceService: FxToleranceService;
  let dbMock: any;

  beforeEach(async () => {
    dbMock = {
      transaction: jest.fn(async (cb) => cb(dbMock)),
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const storageMock = {
      upload: jest.fn().mockResolvedValue('fake-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostEntriesService,
        CostSummaryService,
        FxToleranceService,
        { provide: DRIZZLE, useValue: dbMock },
        { provide: StorageService, useValue: storageMock },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    costEntriesService = module.get<CostEntriesService>(CostEntriesService);
    costSummaryService = module.get<CostSummaryService>(CostSummaryService);
    fxToleranceService = module.get<FxToleranceService>(FxToleranceService);
  });

  it('should trigger fx tolerance warning when outside threshold (FR-06.2)', async () => {
    // Mock for Policy Settings
    const mockWherePolicy = jest
      .fn()
      .mockResolvedValue([{ valueNumeric: '5' }]);
    const mockFromPolicy = { where: mockWherePolicy };

    // Mock for NBE Exchange Rates
    const mockLimit = jest.fn().mockResolvedValue([{ rate: '100' }]);
    const mockOrderBy = { limit: mockLimit };
    const mockWhereNbe = jest
      .fn()
      .mockReturnValue({ orderBy: () => mockOrderBy });
    const mockFromNbe = { where: mockWhereNbe };

    dbMock.select.mockReturnValue({
      from: jest.fn((table) => {
        if (table === schema.policySettings) return mockFromPolicy;
        if (table === schema.nbeExchangeRates) return mockFromNbe;
        return { where: jest.fn().mockResolvedValue([]) };
      }),
    });

    // 120 vs 100 is a 20% variance > 5% threshold
    const result = await fxToleranceService.checkTolerance('USD', 120, dbMock);
    expect(result.hasFxWarning).toBe(true);
    expect(result.fxWarningMessage).toContain('exceeds the NBE Rate');
  });

  it('should reject fx_rate updates as immutable (BR10, FR-08.3)', async () => {
    const mockWhere = jest.fn().mockResolvedValue([{ fxRate: '120.00' }]);
    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({ where: mockWhere }),
    });

    await expect(
      costEntriesService.update('entry-1', { fxRate: 150 }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      costEntriesService.update('entry-1', { fxRate: 150 }),
    ).rejects.toThrow('FX Rate is immutable once saved');
  });

  it('should create a negative mirror on reverse (SRS 2.5, BR02, 5.2)', async () => {
    // 1. Original Entry
    const originalEntry = {
      id: 'entry-1',
      shipmentId: 'ship-1',
      amountForeign: '1000',
      amountEtb: '120000',
      currency: 'USD',
      fxRate: '120',
      invoiceNumber: 'INV-001',
      isEstimated: true,
    };

    const mockWhere = jest.fn().mockResolvedValue([originalEntry]);
    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({ where: mockWhere }),
    });

    // 2. Capture Inserted Mirror
    let insertedValues: any;
    const mockReturningInsert = jest
      .fn()
      .mockResolvedValue([{ id: 'rev-entry-1' }]);
    const mockValues = jest.fn((vals) => {
      insertedValues = vals;
      return { returning: mockReturningInsert };
    });
    dbMock.insert.mockReturnValue({ values: mockValues });

    // 3. Mock Update of Original
    const mockReturningUpdate = jest
      .fn()
      .mockResolvedValue([{ id: 'entry-1' }]);
    const mockWhereUpdate = jest
      .fn()
      .mockReturnValue({ returning: mockReturningUpdate });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhereUpdate });
    dbMock.update.mockReturnValue({ set: mockSet });

    await costEntriesService.reverse(
      'entry-1',
      { reason: 'Data entry error' },
      'user-123',
    );

    // Asserts
    expect(insertedValues).toBeDefined();
    expect(insertedValues.amountForeign).toBe('-1000');
    expect(insertedValues.amountEtb).toBe('-120000');
    expect(insertedValues.reversesEntryId).toBe('entry-1');
    expect(insertedValues.reversalReason).toBe('Data entry error');
    expect(insertedValues.invoiceNumber).toBe('REV-INV-001');
    expect(mockSet).toHaveBeenCalledWith({ reversedByEntryId: 'rev-entry-1' });
  });

  it('should reject new entries if shipment is finalised', async () => {
    // Mock Shipment
    const mockWhere = jest.fn().mockResolvedValue([{ isFinalised: true }]);
    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({ where: mockWhere }),
    });

    await expect(
      costEntriesService.create(
        {
          shipmentId: 'ship-1',
          costCategoryId: 'cat-1',
          providerName: 'P1',
          invoiceNumber: '1',
          invoiceDate: '2026-01-01',
          amountForeign: 100,
          currency: 'USD',
          fxRate: 120,
          isEstimated: false,
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      costEntriesService.create(
        {
          shipmentId: 'ship-1',
          costCategoryId: 'cat-1',
          providerName: 'P1',
          invoiceNumber: '1',
          invoiceDate: '2026-01-01',
          amountForeign: 100,
          currency: 'USD',
          fxRate: 120,
          isEstimated: false,
        },
        'user-1',
      ),
    ).rejects.toThrow('Cannot add cost entries to a finalized shipment');
  });

  it('summary totals match a hand-computed example (FR-06.3)', async () => {
    dbMock.select.mockReturnValue({
      from: jest.fn((table) => {
        if (table === schema.importShipments) {
          return {
            where: jest
              .fn()
              .mockResolvedValue([{ id: 'ship-1', isFinalised: false }]),
          };
        }
        if (table === schema.shipmentItems) {
          return {
            where: jest.fn().mockResolvedValue([
              {
                id: 'item-1',
                itemId: 'uuid-1',
                ciValueEtb: '5000.00',
                shippedQuantity: '10',
              },
              {
                id: 'item-2',
                itemId: 'uuid-2',
                ciValueEtb: '15000.00',
                shippedQuantity: '10',
              },
            ]),
          };
        }
        if (table === schema.importCostEntries) {
          return {
            where: jest.fn().mockResolvedValue([
              {
                costCategoryId: 'cat-1',
                amountEtb: '2000.00',
                isEstimated: false,
                previousEstimateEtb: null,
                reversedByEntryId: null,
              },
              {
                costCategoryId: 'cat-2',
                amountEtb: '4000.00',
                isEstimated: true,
                previousEstimateEtb: null,
                reversedByEntryId: null,
              },
            ]),
          };
        }
        if (table === schema.costCategories) {
          return jest.fn().mockResolvedValue([
            { id: 'cat-1', name: 'Freight' },
            { id: 'cat-2', name: 'Insurance' },
          ])(); // Resolve instantly for category map
        }
      }),
    });

    const summary = await costSummaryService.getSummary('ship-1');

    // Totals
    expect(summary.totalSupplierCostEtb).toBe('20000.0000'); // 5000 + 15000
    expect(summary.totalAdditionalChargesEtb).toBe('6000.0000'); // 2000 + 4000
    expect(summary.grandTotalEtb).toBe('26000.0000'); // 20000 + 6000

    // Variances
    expect(summary.variance.actualTotalEtb).toBe('2000.0000');
    expect(summary.variance.estimatedTotalEtb).toBe('4000.0000');
    expect(summary.variance.varianceAmountEtb).toBe('-2000.0000'); // Actual (2000) - Est (4000)
    expect(summary.variance.variancePercent).toBe('-50.00'); // -2000 / 4000 * 100

    // Previews (Proportional allocation by ciValueEtb)
    // Item 1: 5k (25% weight). 25% of 6000 = 1500. Total = 6500. Per unit (qty 10) = 650.
    expect(summary.itemPreviews[0].allocatedDraftCostsEtb).toBe('1500.0000');
    expect(summary.itemPreviews[0].totalItemLandedCostEtb).toBe('6500.0000');
    expect(summary.itemPreviews[0].perUnitLandedCostEtb).toBe('650.0000');

    // Item 2: 15k (75% weight). 75% of 6000 = 4500. Total = 19500. Per unit (qty 10) = 1950.
    expect(summary.itemPreviews[1].allocatedDraftCostsEtb).toBe('4500.0000');
    expect(summary.itemPreviews[1].totalItemLandedCostEtb).toBe('19500.0000');
    expect(summary.itemPreviews[1].perUnitLandedCostEtb).toBe('1950.0000');
  });
});
