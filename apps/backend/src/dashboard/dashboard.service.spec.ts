import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('returns aggregate operational counts for dashboard cards', async () => {
    const query = {
      from: jest.fn().mockReturnThis(),
      where: jest
        .fn()
        .mockResolvedValueOnce([{ count: 3 }])
        .mockResolvedValueOnce([{ count: 2 }])
        .mockResolvedValueOnce([{ count: 4 }])
        .mockResolvedValueOnce([{ count: 5 }]),
    };
    const db = { select: jest.fn().mockReturnValue(query) };
    const service = new DashboardService(db as any);

    await expect(service.getSummary()).resolves.toEqual({
      pendingPurchaseOrders: 3,
      expiringLettersOfCredit: 2,
      shipmentsAtCustoms: 4,
      registersPendingFinalisation: 5,
    });
    expect(query.where).toHaveBeenCalledTimes(4);
  });
});
