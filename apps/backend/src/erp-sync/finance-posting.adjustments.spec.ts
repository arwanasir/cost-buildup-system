import { Test } from '@nestjs/testing';
import { DRIZZLE } from '@/db/db.token';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceClient } from './clients/finance.client';
import { FinancePostingService } from './finance-posting.service';

describe('FinancePostingService GRN cost adjustments', () => {
  let service: FinancePostingService;
  let db: any;
  let financeClient: { postJournalEntry: jest.Mock };
  let selectWhere: jest.Mock;
  let updateSet: jest.Mock;

  beforeEach(async () => {
    selectWhere = jest.fn();
    updateSet = jest.fn().mockReturnValue({ where: jest.fn() });
    db = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({ where: selectWhere })),
      })),
      update: jest.fn(() => ({ set: updateSet })),
    };
    financeClient = { postJournalEntry: jest.fn().mockResolvedValue({ status: 'posted' }) };

    const module = await Test.createTestingModule({
      providers: [
        FinancePostingService,
        { provide: DRIZZLE, useValue: db },
        { provide: NotificationsService, useValue: { notifyRoles: jest.fn() } },
        { provide: FinanceClient, useValue: financeClient },
      ],
    }).compile();
    service = module.get(FinancePostingService);
  });

  it('posts the final adjustment only after an authorized approval and closes the estimated-cost flag', async () => {
    const grn = {
      id: 'grn-1',
      status: 'flagged_for_adjustment',
      usesEstimatedCost: true,
      postedAt: '2026-11-01T10:00:00.000Z',
    };
    const journal = {
      id: 'journal-1',
      sourceType: 'grn',
      sourceId: 'grn-1',
      lines: [{ account_code: '1000-INV', debit: '10.0000' }],
      posted: false,
    };
    selectWhere
      .mockResolvedValueOnce([grn])
      .mockResolvedValueOnce([journal])
      .mockResolvedValueOnce([grn])
      .mockResolvedValueOnce([
        {
          id: 'grn-item-1',
          shipmentItemId: 'shipment-item-1',
          acceptedQuantity: '5',
        },
      ])
      .mockResolvedValueOnce([
        {
          shipmentItemId: 'shipment-item-1',
          perUnitLandedCostEtb: '12.3456',
        },
      ]);

    const result = await service.approveGrnAdjustment('grn-1', {
      id: 'finance-manager-1',
      role: 'finance_manager',
    });

    expect(financeClient.postJournalEntry).toHaveBeenCalledWith(
      'journal-1',
      'grn-1',
      journal.lines,
    );
    expect(db.update).toHaveBeenCalledTimes(3);
    expect(updateSet).toHaveBeenNthCalledWith(1, {
      perUnitLandedCostEtb: '12.3456',
      lineValueEtb: '61.7280',
    });
    expect(updateSet).toHaveBeenNthCalledWith(2, { posted: true });
    expect(updateSet).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        status: 'posted',
        usesEstimatedCost: false,
        postedAt: grn.postedAt,
      }),
    );
    expect(result.status).toBe('approved_and_posted');
  });

  it('rejects unauthorized approval without posting to ERP', async () => {
    await expect(
      service.approveGrnAdjustment('grn-1', {
        id: 'warehouse-1',
        role: 'warehouse_manager',
      }),
    ).rejects.toThrow('Only Finance Manager or General Manager');
    expect(financeClient.postJournalEntry).not.toHaveBeenCalled();
  });

  it('does not mark local records complete when the ERP rejects the adjustment', async () => {
    const grn = {
      id: 'grn-1',
      usesEstimatedCost: true,
      postedAt: '2026-11-01T10:00:00.000Z',
    };
    const journal = {
      id: 'journal-1',
      sourceType: 'grn',
      sourceId: 'grn-1',
      lines: [],
      posted: false,
    };
    selectWhere
      .mockResolvedValueOnce([grn])
      .mockResolvedValueOnce([journal])
      .mockResolvedValueOnce([grn])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    financeClient.postJournalEntry.mockRejectedValueOnce(
      new Error('ERP unavailable'),
    );

    await expect(
      service.approveGrnAdjustment('grn-1', {
        id: 'finance-manager-1',
        role: 'finance_manager',
      }),
    ).rejects.toThrow('ERP unavailable');
    expect(db.update).not.toHaveBeenCalled();
  });
});
