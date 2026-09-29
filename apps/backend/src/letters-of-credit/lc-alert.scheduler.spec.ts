import { Test, TestingModule } from '@nestjs/testing';
import { LcAlertScheduler } from './lc-alert.scheduler';
import { DRIZZLE } from '@/db';
import { Logger } from '@nestjs/common';
import * as schema from '@/db/schema';
import { eq, or, and, sql } from 'drizzle-orm';
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
        { provide: NotificationsService, useValue: { notifyRoles: jest.fn() } },
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

    // Ensure no notifications are inserted if DB returns nothing
    expect(mockInsert).not.toHaveBeenCalled();
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

    expect(mockInsert).toHaveBeenCalledTimes(3);

    const firstNotification = mockValues.mock.calls[0][0];
    expect(firstNotification.entityId).toBe('lc-expiry');
    expect(firstNotification.type).toBe('lc_expiry');
    expect(firstNotification.titleEn).toContain('30 days'); // asserts 30 boundary

    const secondNotification = mockValues.mock.calls[1][0];
    expect(secondNotification.entityId).toBe('lc-shipment');
    expect(secondNotification.type).toBe('lc_last_shipment');
    expect(secondNotification.titleEn).toContain('3 days'); // asserts 3 boundary

    const thirdNotification = mockValues.mock.calls[2][0];
    expect(thirdNotification.entityId).toBe('lc-docs');
    expect(thirdNotification.type).toBe('lc_presentation');
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

    expect(mockInsert).not.toHaveBeenCalled(); // No notifications created!
  });
});
