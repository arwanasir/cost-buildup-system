import { FinalisationGuardService } from './finalisation-guard.service';

describe('FinalisationGuardService', () => {
  it.each(['confirmed', 'posted', 'posting_failed', 'flagged_for_adjustment'])(
    'recognizes a received GRN in %s status',
    async (status) => {
      const rowsByTable: Record<string, any[]> = {
        import_shipments: [
          { id: 'shipment-1', status: 'received', isFinalised: false },
        ],
        import_cost_entries: [],
        cost_variances: [],
        goods_receipts: [{ id: 'grn-1', status }],
        policy_settings: [],
        shipment_items: [],
        commercial_invoices: [],
      };
      const db = {
        select: jest.fn(() => ({
          from: (table: any) => ({
            where: jest
              .fn()
              .mockResolvedValue(
                rowsByTable[table[Symbol.for('drizzle:Name')]],
              ),
          }),
        })),
      };
      const guard = new FinalisationGuardService(db as any);

      const blockers = await guard.check('shipment-1');

      expect(blockers).not.toContain(
        'No confirmed Goods Receiving Note (GRN) found for this shipment.',
      );
    },
  );

  it('blocks finalisation when no eligible GRN exists', async () => {
    const rowsByTable: Record<string, any[]> = {
      import_shipments: [
        { id: 'shipment-1', status: 'received', isFinalised: false },
      ],
      import_cost_entries: [],
      cost_variances: [],
      goods_receipts: [],
      policy_settings: [],
      shipment_items: [],
      commercial_invoices: [],
    };
    const db = {
      select: jest.fn(() => ({
        from: (table: any) => ({
          where: jest
            .fn()
            .mockResolvedValue(rowsByTable[table[Symbol.for('drizzle:Name')]]),
        }),
      })),
    };
    const guard = new FinalisationGuardService(db as any);

    const blockers = await guard.check('shipment-1');

    expect(blockers).toContain(
      'No confirmed Goods Receiving Note (GRN) found for this shipment.',
    );
  });

  it.each(['pending_approval', 'rejected'])(
    'blocks finalisation while a cost variance is %s',
    async (status) => {
      const rowsByTable: Record<string, any[]> = {
        import_shipments: [
          { id: 'shipment-1', status: 'received', isFinalised: false },
        ],
        import_cost_entries: [],
        cost_variances: [{ id: 'variance-1', status }],
        goods_receipts: [{ id: 'grn-1', status: 'confirmed' }],
        policy_settings: [],
        shipment_items: [],
        commercial_invoices: [],
      };
      const db = {
        select: jest.fn(() => ({
          from: (table: any) => ({
            where: jest
              .fn()
              .mockResolvedValue(
                rowsByTable[table[Symbol.for('drizzle:Name')]],
              ),
          }),
        })),
      };
      const guard = new FinalisationGuardService(db as any);

      const blockers = await guard.check('shipment-1');

      expect(blockers).toContain(
        'BR07: Found 1 unresolved cost variance(s) (pending approval or rejected) requiring Finance Manager approval before finalisation.',
      );
    },
  );

  it('blocks finalisation for a CI price variance not acknowledged by Procurement', async () => {
    const rowsByTable: Record<string, any[]> = {
      import_shipments: [
        { id: 'shipment-1', status: 'received', isFinalised: false },
      ],
      import_cost_entries: [],
      cost_variances: [],
      goods_receipts: [{ id: 'grn-1', status: 'confirmed' }],
      policy_settings: [{ valueNumeric: '5' }],
      shipment_items: [],
      commercial_invoices: [
        {
          id: 'ci-1',
          priceVariancePct: '8',
          varianceAcknowledgedBy: null,
        },
      ],
    };
    const db = {
      select: jest.fn(() => ({
        from: (table: any) => ({
          where: jest
            .fn()
            .mockResolvedValue(rowsByTable[table[Symbol.for('drizzle:Name')]]),
        }),
      })),
    };
    const guard = new FinalisationGuardService(db as any);

    const blockers = await guard.check('shipment-1');

    expect(blockers).toContain(
      'BR11: Found 1 commercial invoice(s) with unacknowledged price variances exceeding the 5% threshold: [ci-1].',
    );
  });
});
