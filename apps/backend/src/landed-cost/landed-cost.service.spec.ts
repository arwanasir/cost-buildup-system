import { Test, TestingModule } from '@nestjs/testing';
import { LandedCostService } from './landed-cost.service';
import { AllocationService } from '@/allocation/allocation.service';
import { FinalisationGuardService } from './finalisation-guard.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DRIZZLE } from '@/db';

describe('LandedCostService (TC-COST01, AC05)', () => {
  let service: LandedCostService;
  let txMock: any;
  let dbMock: any;

  beforeEach(async () => {
    txMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn(),
      delete: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockImplementation((vals) => Promise.resolve(vals)),
    };

    dbMock = {
      transaction: jest.fn(async (cb) => cb(txMock)),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandedCostService,
        {
          provide: AllocationService,
          useValue: { allocateShipment: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: FinalisationGuardService,
          useValue: { check: jest.fn().mockResolvedValue([]) },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    service = module.get<LandedCostService>(LandedCostService);
  });

  it('computes landed cost across all allocation methods with exact 4.1.4 schema and 6dp rounding', async () => {
    // 1. Mock 5 Shipment Items
    const mockItems = [
      {
        id: 'item-1',
        shipmentId: 'ship-1',
        ciValueEtb: '1000.0000',
        shippedQuantity: '10',
      },
      {
        id: 'item-2',
        shipmentId: 'ship-1',
        ciValueEtb: '2000.0000',
        shippedQuantity: '20',
      },
      {
        id: 'item-3',
        shipmentId: 'ship-1',
        ciValueEtb: '3000.0000',
        shippedQuantity: '30',
      },
      {
        id: 'item-4',
        shipmentId: 'ship-1',
        ciValueEtb: '4000.0000',
        shippedQuantity: '40',
      },
      {
        id: 'item-5',
        shipmentId: 'ship-1',
        ciValueEtb: '5000.0000',
        shippedQuantity: '50',
      },
    ];

    // 2. Mock Cross-Matrix Allocations (Balanced perfectly for Reconciliation)
    const mockAllocations = [
      ...['FREIGHT', 'INSURANCE', 'PORT', 'BANK'].flatMap((category) => [
        {
          shipmentItemId: 'item-1',
          allocatedEtb: '100.0000',
          categoryCode: category,
        },
        {
          shipmentItemId: 'item-2',
          allocatedEtb: '200.0000',
          categoryCode: category,
        },
        {
          shipmentItemId: 'item-3',
          allocatedEtb: '300.0000',
          categoryCode: category,
        },
        {
          shipmentItemId: 'item-4',
          allocatedEtb: '400.0000',
          categoryCode: category,
        },
        {
          shipmentItemId: 'item-5',
          allocatedEtb: '500.0000',
          categoryCode: category,
        },
      ]),
      ...['CLEARING', 'OTHER'].flatMap((category) => [
        {
          shipmentItemId: 'item-1',
          allocatedEtb: '100.0000',
          categoryCode: category,
        },
        {
          shipmentItemId: 'item-2',
          allocatedEtb: '100.0000',
          categoryCode: category,
        },
        {
          shipmentItemId: 'item-3',
          allocatedEtb: '100.0000',
          categoryCode: category,
        },
        {
          shipmentItemId: 'item-4',
          allocatedEtb: '100.0000',
          categoryCode: category,
        },
        {
          shipmentItemId: 'item-5',
          allocatedEtb: '100.0000',
          categoryCode: category,
        },
      ]),
      {
        shipmentItemId: 'item-1',
        allocatedEtb: '750.0000',
        categoryCode: 'CUSTOMS_DUTY',
      },
      {
        shipmentItemId: 'item-2',
        allocatedEtb: '750.0000',
        categoryCode: 'VAT',
      },
    ];

    // 3. Mock Active Cost Entries for the 0.0001 Reconciliation Check
    // (4 base rules * 1500) + (2 extra * 500) + 750 + 750 = 8500
    const mockActiveEntries = [
      { amountEtb: '1500.0000' },
      { amountEtb: '1500.0000' },
      { amountEtb: '1500.0000' },
      { amountEtb: '1500.0000' },
      { amountEtb: '500.0000' },
      { amountEtb: '500.0000' },
      { amountEtb: '750.0000' },
      { amountEtb: '750.0000' },
    ];

    let whereCount = 0;
    txMock.where.mockImplementation(() => {
      whereCount++;
      if (whereCount === 1) return Promise.resolve(mockItems); // shipmentItems
      if (whereCount === 2) return Promise.resolve([]); // GRN (fallback to BL qty)
      if (whereCount === 3) return Promise.resolve(mockAllocations); // costAllocations
      if (whereCount === 4) return Promise.resolve(mockActiveEntries); // activeEntries check
      return Promise.resolve(true); // delete
    });

    const results = await service.computeDraft('ship-1');

    // Assert overall structural integrity
    expect(results).toHaveLength(5);
    expect(txMock.insert).toHaveBeenCalled();
    expect(txMock.values).toHaveBeenCalledWith(results);

    // Assert Item 1: Complete 4.1.4 Mapping with Item-Specific Duty
    const item1 = results.find((r: any) => r.shipmentItemId === 'item-1');
    expect(item1).toBeDefined();
    expect(item1.ciValueEtb).toBe('1000.0000');
    expect(item1.customsDutyEtb).toBe('750.0000'); // Explicit item-specific duty
    expect(item1.importVatEtb).toBe('0.0000');
    expect(item1.freightAllocatedEtb).toBe('100.0000');
    expect(item1.insuranceAllocatedEtb).toBe('100.0000');
    expect(item1.portChargesAllocatedEtb).toBe('100.0000');
    expect(item1.bankChargesAllocatedEtb).toBe('100.0000');
    expect(item1.clearingFeeAllocatedEtb).toBe('100.0000');
    expect(item1.otherChargesAllocatedEtb).toBe('100.0000');
    // Total = 1000 + 4*100 + 2*100 + 750 = 2350
    expect(item1.totalLandedCostEtb).toBe('2350.0000');
    // Per unit = 2350 / 10 = 235.000000
    expect(item1.perUnitLandedCostEtb).toBe('235.000000');

    // Assert Item 2: Mixed Mapping with Item-Specific VAT
    const item2 = results.find((r: any) => r.shipmentItemId === 'item-2');
    expect(item2.customsDutyEtb).toBe('0.0000');
    expect(item2.importVatEtb).toBe('750.0000'); // Explicit item-specific VAT
    expect(item2.freightAllocatedEtb).toBe('200.0000');
    expect(item2.otherChargesAllocatedEtb).toBe('100.0000');
    // Total = 2000 + 4*200 + 2*100 + 750 = 3750
    expect(item2.totalLandedCostEtb).toBe('3750.0000');
    // Per unit = 3750 / 20 = 187.500000
    expect(item2.perUnitLandedCostEtb).toBe('187.500000');

    // Assert Item 5: Perfect math resolution up to 6dp precision
    const item5 = results.find((r: any) => r.shipmentItemId === 'item-5');
    // Total = 5000 + 4*500 + 2*100 = 7200
    expect(item5.totalLandedCostEtb).toBe('7200.0000');
    // Per unit = 7200 / 50 = 144.000000
    expect(item5.perUnitLandedCostEtb).toBe('144.000000');
  });
});
