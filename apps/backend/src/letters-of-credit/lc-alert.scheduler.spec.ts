import { Test, TestingModule } from '@nestjs/testing';
import { LcAlertScheduler } from './lc-alert.scheduler';
import { DRIZZLE } from '@/db/db.token';
import { Logger } from '@nestjs/common';
import * as schema from '@/db/schema';
import { NotificationsService } from '@/notifications/notifications.service';

jest.mock('drizzle-orm', () => {
  const original = jest.requireActual('drizzle-orm');
  return {
    ...original,
    eq: jest.fn((col, val) => ({ type: 'eq', col, val })),
    or: jest.fn((...args) => ({ type: 'or', args })),
    and: jest.fn((...args) => ({ type: 'and', args })),
  };
});

describe('LcAlertScheduler', () => {
  let scheduler: LcAlertScheduler;
  let mockDb: any;
  let mockWhereLC: jest.Mock;
  let mockWherePO: jest.Mock;
  let mockInsert: jest.Mock;
  let mockValues: jest.Mock;
  let mockNotifyRoles: jest.Mock;

  beforeEach(async () => {
    mockWhereLC = jest.fn().mockResolvedValue([]);
    mockWherePO = jest.fn().mockResolvedValue([]);
    const mockFrom = jest.fn((table) => {
      if (table === schema.lettersOfCredit) return { where: mockWhereLC };
      if (table === schema.importPurchaseOrders) return { where: mockWherePO };
      return { where: jest.fn().mockResolvedValue([]) };
    });

    mockValues = jest.fn().mockResolvedValue([]);
    mockInsert = jest.fn(() => ({ values: mockValues }));
    mockNotifyRoles = jest.fn().mockResolvedValue(undefined);

    mockDb = {
      select: jest.fn(() => ({ from: mockFrom })),
      insert: mockInsert,
      query: {
        notifications: { findFirst: jest.fn().mockResolvedValue(null) },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LcAlertScheduler,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: NotificationsService,
          useValue: { notifyRoles: mockNotifyRoles },
        },
      ],
    }).compile();

    scheduler = module.get<LcAlertScheduler>(LcAlertScheduler);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should query for notifications exactly at 30, 7, 14, and 3 day boundaries', async () => {
    // Fake clock to 2026-09-20T08:00:00Z
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-20T08:00:00Z'));

    await scheduler.checkLcAlerts();

    // 1. Expiry Check (30 and 7 days)
    // 2026-09-20 + 30 days = 2026-10-20
    // 2026-09-20 + 7 days = 2026-09-27
    const expiryCall = mockWhereLC.mock.calls[0][0]; // first call to lettersOfCredit where
    expect(expiryCall.type).toBe('or');
    expect(expiryCall.args[0]).toEqual({
      type: 'eq',
      col: schema.lettersOfCredit.expiryDate,
      val: '2026-10-20',
    });
    expect(expiryCall.args[1]).toEqual({
      type: 'eq',
      col: schema.lettersOfCredit.expiryDate,
      val: '2026-09-27',
    });

    // 2. Shipment Check (14 and 3 days)
    // 2026-09-20 + 14 days = 2026-10-04
    // 2026-09-20 + 3 days = 2026-09-23
    const shipmentCall = mockWhereLC.mock.calls[1][0]; // second call to lettersOfCredit where
    expect(shipmentCall.type).toBe('or');
    expect(shipmentCall.args[0]).toEqual({
      type: 'eq',
      col: schema.lettersOfCredit.lastShipmentDate,
      val: '2026-10-04',
    });
    expect(shipmentCall.args[1]).toEqual({
      type: 'eq',
      col: schema.lettersOfCredit.lastShipmentDate,
      val: '2026-09-23',
    });

    expect(mockNotifyRoles).not.toHaveBeenCalled();
  });

  it('uses the Ethiopian business date even when UTC is on the previous day', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-20T22:30:00Z'));

    await scheduler.checkLcAlerts();

    const expiryCall = mockWhereLC.mock.calls[0][0];
    expect(expiryCall.args[0].val).toBe('2026-10-21');
    expect(expiryCall.args[1].val).toBe('2026-09-28');
    const shipmentCall = mockWhereLC.mock.calls[1][0];
    expect(shipmentCall.args[0].val).toBe('2026-10-05');
    expect(shipmentCall.args[1].val).toBe('2026-09-24');
  });

  it('should create notifications for LCs matching the boundaries and unshipped POs', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-20T08:00:00Z'));

    // Mock DB to return an LC expiring in 30 days
    mockWhereLC.mockResolvedValueOnce([
      {
        id: 'lc-expiry',
        lcNumber: 'LC001',
        expiryDate: '2026-10-20',
        createdBy: 'u1',
      },
    ]);

    // Mock PO query to return an unshipped PO
    mockWherePO.mockResolvedValueOnce([{ id: 'po1', status: 'lc_applied' }]);

    // Mock DB to return an LC with lastShipment in 3 days
    mockWhereLC.mockResolvedValueOnce([
      {
        id: 'lc-shipment',
        lcNumber: 'LC002',
        lastShipmentDate: '2026-09-23',
        createdBy: 'u1',
      },
    ]);

    // Mock docs_received
    mockWhereLC.mockResolvedValueOnce([
      {
        id: 'lc-docs',
        lcNumber: 'LC003',
        status: 'docs_received',
        createdBy: 'u1',
      },
    ]);

    await scheduler.checkLcAlerts();

    expect(mockNotifyRoles).toHaveBeenCalledTimes(3);
    expect(mockNotifyRoles).toHaveBeenNthCalledWith(
      1,
      'lc_expiry',
      { type: 'letter_of_credit', id: 'lc-expiry' },
      expect.objectContaining({
        lcNumber: 'LC001',
        expiryDate: '2026-10-20',
        days: 30,
      }),
    );
    expect(mockNotifyRoles).toHaveBeenNthCalledWith(
      2,
      'lc_last_shipment',
      { type: 'letter_of_credit', id: 'lc-shipment' },
      expect.objectContaining({
        lcNumber: 'LC002',
        lastShipmentDate: '2026-09-23',
        days: 3,
      }),
    );
    expect(mockNotifyRoles).toHaveBeenNthCalledWith(
      3,
      'lc_presentation',
      { type: 'letter_of_credit', id: 'lc-docs' },
      expect.objectContaining({
        lcNumber: 'LC003',
        presentationDate: '2026-10-11',
      }),
    );
  });

  it('should NOT create lc_expiry notification if all POs are shipped', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-20T08:00:00Z'));

    // LC matches 7 day boundary
    mockWhereLC.mockResolvedValueOnce([
      {
        id: 'lc-expiry',
        lcNumber: 'LC001',
        expiryDate: '2026-09-27',
        createdBy: 'u1',
      },
    ]);

    // PO is shipped!
    mockWherePO.mockResolvedValueOnce([{ id: 'po1', status: 'shipped' }]);

    // Empty for the others
    mockWhereLC.mockResolvedValueOnce([]);
    mockWhereLC.mockResolvedValueOnce([]);

    await scheduler.checkLcAlerts();

    expect(mockNotifyRoles).not.toHaveBeenCalled(); // Shipped POs need no expiry alert.
  });
});
