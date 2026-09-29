import { Test, TestingModule } from '@nestjs/testing';
import { LandedCostService } from './landed-cost.service';
import { FinalisationGuardService } from './finalisation-guard.service';
import { VariancesService } from '@/variances/variances.service';
import { AllocationService } from '@/allocation/allocation.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DRIZZLE } from '@/db';
import { BadRequestException } from '@nestjs/common';

describe('Integration (TC-VAR-01): Finalise Refused with Pending Variance', () => {
  let landedCostService: LandedCostService;
  let variancesService: VariancesService;
  let eventEmitter: EventEmitter2;

  let mockVariances: any[];
  let dbMock: any;

  beforeEach(async () => {
    // Initial state: One variance is pending
    mockVariances = [
      { id: 'var-1', shipmentId: 'ship-1', status: 'pending_approval' },
    ];

    eventEmitter = new EventEmitter2();

    const fromMock = jest.fn((table: any) => {
      const tableName =
        table[Symbol.for('drizzle:Name')] || table.name || table.toString();
      const qb = {
        where: (condition: any) => qb,
        then: (resolve: any) => {
          if (tableName === 'import_shipments')
            return resolve([
              { id: 'ship-1', status: 'customs_released', isFinalised: false },
            ]);
          if (tableName === 'import_cost_entries') return resolve([]); // No estimated costs remaining
          if (tableName === 'cost_variances') {
            // Guard specifically checks for pending variances
            return resolve(
              mockVariances.filter((v) => v.status === 'pending_approval'),
            );
          }
          if (tableName === 'goods_receipts')
            return resolve([{ id: 'grn-1', status: 'confirmed' }]);
          if (tableName === 'policy_settings') return resolve([]);
          if (tableName === 'shipment_items') return resolve([]);
          return resolve([]);
        },
      };
      return qb;
    });

    const updateMock = jest.fn((table: any) => {
      const tableName =
        table[Symbol.for('drizzle:Name')] || table.name || table.toString();
      let capturedSet: any = null;

      const setQb = {
        set: (data: any) => {
          capturedSet = data;
          return setQb;
        },
        where: (condition: any) => {
          return setQb;
        },
        returning: () => setQb,
        then: (resolve: any) => {
          if (
            tableName === 'cost_variances' &&
            capturedSet &&
            capturedSet.status
          ) {
            mockVariances[0].status = capturedSet.status;
            return resolve([mockVariances[0]]);
          }
          if (tableName === 'import_shipments')
            return resolve([{ id: 'ship-1', isFinalised: true }]);
          if (tableName === 'import_cost_entries') return resolve([]);
          return resolve([]);
        },
      };
      return setQb;
    });

    dbMock = {
      transaction: jest.fn(async (cb) => cb(dbMock)),
      select: jest.fn(() => ({ from: fromMock })),
      update: updateMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandedCostService,
        FinalisationGuardService,
        VariancesService,
        {
          provide: AllocationService,
          useValue: { allocateShipment: jest.fn() },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    landedCostService = module.get<LandedCostService>(LandedCostService);
    variancesService = module.get<VariancesService>(VariancesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('TC-VAR-01: should refuse finalise while variance is pending, then succeed after approval', async () => {
    const actor = { id: 'fm-1', role: 'finance_manager' };

    // Step 1: Attempt to finalize while variance is pending
    await expect(landedCostService.finalise('ship-1', actor)).rejects.toThrow(
      BadRequestException,
    );

    // We can also verify that the specific error message mentions BR07
    try {
      await landedCostService.finalise('ship-1', actor);
    } catch (e: any) {
      expect(e.getResponse().blockers[0]).toContain(
        'BR07: Found 1 pending cost variance(s) requiring approval.',
      );
    }

    // Step 2: Approve the variance
    const approvedVariance = await variancesService.approve(
      'var-1',
      actor,
      'Approved minor freight discrepancy',
    );

    // Verify state mutation via our mock
    expect(approvedVariance.status).toBe('approved');
    expect(mockVariances[0].status).toBe('approved');

    // Step 3: Attempt finalization again
    const emitSpy = jest.spyOn(eventEmitter, 'emit');
    const result = await landedCostService.finalise('ship-1', actor);

    // Verify it succeeded
    expect(result).toBeDefined();

    // Verify it emitted the correct event
    expect(emitSpy).toHaveBeenCalledWith(
      'landedCost.finalised',
      expect.objectContaining({
        shipmentId: 'ship-1',
        actorId: actor.id,
      }),
    );
  });
});
