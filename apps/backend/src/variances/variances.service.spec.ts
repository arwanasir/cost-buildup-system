import { Test, TestingModule } from '@nestjs/testing';
import { VariancesService } from './variances.service';
import { DRIZZLE } from '@/db';

describe('VariancesService - Evaluate', () => {
  let service: VariancesService;
  let insertedRows: any;
  let insertedNotifications: any;

  beforeEach(async () => {
    insertedRows = null;
    insertedNotifications = null;

    class MockDb {
      transaction(cb: any) {
        return cb(this);
      }
      select() {
        return {
          from: (table: any) => {
            // Check the internal Drizzle table name symbol or fallback
            const t =
              table[Symbol.for('drizzle:Name')] ||
              table.name ||
              table.toString();
            const qb = {
              where: () => qb,
              then: (resolve: any) => {
                if (t === 'import_shipments')
                  return resolve([
                    { id: 'ship-1', poId: 'po-1', shipmentNumber: 'SHP-999' },
                  ]);
                if (t === 'import_purchase_orders')
                  return resolve([
                    {
                      id: 'po-1',
                      totalValueForeign: '1000',
                      fxRate: '50',
                      estimatedFreightEtb: '20000',
                      estimatedDutyEtb: '20000',
                      estimatedInsuranceEtb: '5000',
                      estimatedOtherChargesEtb: '5000',
                    },
                  ]);
                if (t === 'commercial_invoices')
                  return resolve([
                    {
                      shipmentId: 'ship-1',
                      totalForeign: '1030',
                      fxRate: '50',
                    },
                  ]);
                if (t === 'policy_settings')
                  return resolve([
                    { key: 'variance_threshold_pct', valueNumeric: '2.0' },
                  ]);
                if (t === 'cost_categories')
                  return resolve([
                    { id: 'cat-f', code: 'freight' },
                    { id: 'cat-d', code: 'duty' },
                    { id: 'cat-o', code: 'other' },
                  ]);
                if (t === 'import_cost_entries')
                  return resolve([
                    {
                      costCategoryId: 'cat-f',
                      amountEtb: '22500',
                      isEstimated: false,
                    },
                    {
                      costCategoryId: 'cat-d',
                      amountEtb: '20000',
                      isEstimated: false,
                    },
                    {
                      costCategoryId: 'cat-o',
                      amountEtb: '10000',
                      isEstimated: false,
                    },
                  ]);
                if (t === 'users')
                  return resolve([{ id: 'fm-1', role: 'finance_manager' }]);
                return resolve([]);
              },
            };
            return qb;
          },
        };
      }
      delete() {
        return { where: () => ({ then: (r: any) => r([]) }) };
      }
      insert(table: any) {
        return {
          values: (vals: any) => {
            const qb = {
              returning: () => {
                insertedRows = vals;
                return { then: (r: any) => r(vals) };
              },
              then: (r: any) => {
                const t = table[Symbol.for('drizzle:Name')] || table.name;
                if (t === 'notifications') {
                  insertedNotifications = vals;
                } else if (!insertedRows) {
                  insertedRows = vals;
                }
                return r(vals);
              },
            };
            return qb;
          },
        };
      }
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariancesService,
        { provide: DRIZZLE, useValue: new MockDb() },
      ],
    }).compile();

    service = module.get<VariancesService>(VariancesService);
  });

  it('should compute exact variances, auto-approve 1.5% and pend 2.5% into 5 distinct categories', async () => {
    // Math Setup:
    // Total Estimated Landed Cost = 100,000 ETB
    // Price Est: 50,000 (1000 USD * 50 FX). Act: 51,500 (1030 USD * 50 FX) => Variance +1500 ETB (1.5%) -> Auto Approved
    // Exchange Est: 51,500 (1030 * 50). Act: 51,500 (1030 * 50) => Variance 0 ETB (0%) -> Auto Approved
    // Freight Est: 20,000. Act: 22,500 => Variance +2500 ETB (2.5%) -> Pending Approval
    // Duty Est: 20,000. Act: 20,000 => Variance 0 ETB (0%) -> Auto Approved
    // Other Est: 10,000 (5000+5000). Act: 10,000 => Variance 0 ETB (0%) -> Auto Approved

    await service.evaluate('ship-1');

    expect(insertedRows).toHaveLength(5);

    const priceVar = insertedRows.find((r: any) => r.varianceType === 'price');
    expect(priceVar.estimatedEtb).toBe('50000.0000');
    expect(priceVar.actualEtb).toBe('51500.0000');
    expect(priceVar.varianceEtb).toBe('1500.0000');
    expect(priceVar.variancePct).toBe('1.500000');
    expect(priceVar.status).toBe('auto_approved');

    const exchangeVar = insertedRows.find(
      (r: any) => r.varianceType === 'exchange_rate',
    );
    expect(exchangeVar.varianceEtb).toBe('0.0000');
    expect(exchangeVar.variancePct).toBe('0.000000');
    expect(exchangeVar.status).toBe('auto_approved');

    const freightVar = insertedRows.find(
      (r: any) => r.varianceType === 'freight',
    );
    expect(freightVar.estimatedEtb).toBe('20000.0000');
    expect(freightVar.actualEtb).toBe('22500.0000');
    expect(freightVar.varianceEtb).toBe('2500.0000');
    expect(freightVar.variancePct).toBe('2.500000');
    expect(freightVar.status).toBe('pending_approval');

    const dutyVar = insertedRows.find((r: any) => r.varianceType === 'duty');
    expect(dutyVar.varianceEtb).toBe('0.0000');
    expect(dutyVar.status).toBe('auto_approved');

    const otherVar = insertedRows.find((r: any) => r.varianceType === 'other');
    expect(otherVar.varianceEtb).toBe('0.0000');
    expect(otherVar.status).toBe('auto_approved');

    // Notifications checks
    expect(insertedNotifications).toBeDefined();
    expect(insertedNotifications).toHaveLength(1); // 1 finance manager
    expect(insertedNotifications[0].bodyEn).toContain('exceeding the 2');
    expect(insertedNotifications[0].bodyEn).toContain('freight');
  });
});
