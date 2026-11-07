import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('returns only aggregate pending PO and expiring LC counts', async () => {
    const query = {
      from: jest.fn().mockReturnThis(),
      where: jest
        .fn()
        .mockResolvedValueOnce([{ count: 3 }])
        .mockResolvedValueOnce([{ count: 2 }]),
    };
    const db = { select: jest.fn().mockReturnValue(query) };
    const service = new DashboardService(db as any);

    await expect(service.getSummary()).resolves.toEqual({
      pendingPurchaseOrders: 3,
      expiringLettersOfCredit: 2,
    });
    expect(query.where).toHaveBeenCalledTimes(2);
  });
});
