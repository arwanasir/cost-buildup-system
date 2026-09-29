import { Test, TestingModule } from '@nestjs/testing';
import { AllocationService } from './allocation.service';
import { AllocationBasisService } from './allocation-basis.service';
import { DRIZZLE } from '@/db';

describe('Allocation Performance (AC13, SRS 5.1)', () => {
  let allocationService: AllocationService;
  let dbMock: any;

  beforeAll(async () => {
    dbMock = {
      transaction: jest.fn(async (cb) => cb(dbMock)),
      select: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationService,
        AllocationBasisService,
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    allocationService = module.get<AllocationService>(AllocationService);
  });

  it('should allocate 1 shipment with 200 items and 30 cost entries in under 3 seconds', async () => {
    // 1. Seed 200 items
    const mockItems = Array.from({ length: 200 }).map((_, idx) => ({
      id: `item-${idx}`,
      shipmentId: 'shipment-perf',
      ciValueEtb: (1000 + idx * 10).toString(),
      weightKg: (50 + idx).toString(),
      volumeCbm: (2 + idx * 0.1).toString(),
      shippedQuantity: '100',
    }));

    // 2. Seed 30 cost entries
    const methods = [
      'by_value',
      'by_weight',
      'by_volume',
      'by_quantity',
      'equal_split',
    ];
    const mockEntries = Array.from({ length: 30 }).map((_, idx) => ({
      id: `entry-${idx}`,
      shipmentId: 'shipment-perf',
      amountEtb: (5000 + idx * 100).toString(),
      allocationMethod: methods[idx % methods.length],
      isItemSpecific: false,
      reversedByEntryId: null,
    }));

    // 3. Sequential Mocking
    const whereMock = jest
      .fn()
      .mockResolvedValueOnce(mockItems) // First query: shipmentItems
      .mockResolvedValueOnce(mockEntries); // Second query: importCostEntries

    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({ where: whereMock }),
    });

    dbMock.delete.mockReturnValue({ where: jest.fn().mockResolvedValue(true) });
    dbMock.insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(true),
    });

    // 4. Execution & Timing
    const start = performance.now();

    const results = await allocationService.allocateShipment('shipment-perf');

    const end = performance.now();
    const durationMs = end - start;

    // 5. Assertions
    expect(results.length).toBe(200 * 30); // 6000 specific allocations generated
    expect(durationMs).toBeLessThan(3000); // Performance boundary constraint

    console.log(
      `Performance Test Completed: Computed ${results.length} fractional allocations in ${durationMs.toFixed(2)} ms`,
    );
  });
});
