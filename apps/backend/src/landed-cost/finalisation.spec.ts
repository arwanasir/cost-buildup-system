import { Test, TestingModule } from '@nestjs/testing';
import { FinalisationGuardService } from './finalisation-guard.service';
import { DRIZZLE } from '@/db';

describe('Finalisation Workflow (AC07, BR02, BR05, BR07)', () => {
  let guardService: FinalisationGuardService;
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
      providers: [
        FinalisationGuardService,
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    guardService = module.get<FinalisationGuardService>(
      FinalisationGuardService,
    );
  });

  const setupMocks = (overrides: any) => {
    let callCount = 0;
    whereMock.mockImplementation(() => {
      callCount++;
      // 1. Shipment Status Check
      if (callCount === 1)
        return Promise.resolve([
          overrides.shipment || {
            status: 'customs_released',
            isFinalised: false,
          },
        ]);
      // 2. Estimated entries (BR05)
      if (callCount === 2)
        return Promise.resolve(overrides.estimatedEntries || []);
      // 3. Pending variances (BR07)
      if (callCount === 3)
        return Promise.resolve(overrides.pendingVariances || []);
      // 4. Confirmed GRN
      if (callCount === 4)
        return Promise.resolve(overrides.confirmedGrns || [{ id: 'grn-1' }]);
      // 5. Policy settings (BR11 threshold)
      if (callCount === 5) return Promise.resolve([{ valueNumeric: '5.0' }]);
      // 6. Shipment Items (BR11)
      if (callCount === 6)
        return Promise.resolve(overrides.shipmentItems || []);

      return Promise.resolve([]);
    });
  };

  it('blocks finalisation if an estimated entry remains (BR05)', async () => {
    setupMocks({
      estimatedEntries: [{ id: 'est-1' }],
    });

    const blockers = await guardService.check('ship-1');
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers[0]).toContain('BR05: Cannot finalize with estimated costs');
  });

  it('unblocks finalisation if the estimated entry was explicitly accepted with justification (BR05 exception)', async () => {
    // If accept-estimates was called, the query (which filters for isNull(estimateAcceptedBy)) returns empty
    setupMocks({
      estimatedEntries: [],
    });

    const blockers = await guardService.check('ship-1');
    expect(blockers).toHaveLength(0); // No blockers
  });

  it('blocks finalisation if there is a pending variance (BR07)', async () => {
    setupMocks({
      pendingVariances: [{ id: 'var-1' }],
    });

    const blockers = await guardService.check('ship-1');
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers[0]).toContain('BR07: Found 1 pending cost variance');
  });

  it('blocks finalisation if there is no confirmed GRN', async () => {
    setupMocks({
      confirmedGrns: [], // No confirmed GRN found
    });

    const blockers = await guardService.check('ship-1');
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers[0]).toContain(
      'No confirmed Goods Receiving Note (GRN) found',
    );
  });

  it('is absolutely irreversible after success (BR02)', async () => {
    setupMocks({
      shipment: { status: 'customs_released', isFinalised: true }, // Already finalised
    });

    const blockers = await guardService.check('ship-1');
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toContain(
      'Shipment is already finalised. Finalisation is irreversible (BR02).',
    );
  });
});
