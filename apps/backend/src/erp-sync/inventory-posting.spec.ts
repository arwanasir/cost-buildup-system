import { Test, TestingModule } from '@nestjs/testing';
import { InventoryPostingService } from './inventory-posting.service';
import { DRIZZLE } from '@/db';
import { NotificationsService } from '@/notifications/notifications.service';
import { InventoryClient } from './clients/inventory.client';

describe('ERP Sync & Inventory Posting (SRS 7.1)', () => {
  let service: InventoryPostingService;
  let selectWhereMock: jest.Mock;
  let updateWhereMock: jest.Mock;
  let updateSetMock: jest.Mock;
  let insertValuesMock: jest.Mock;
  let dbMock: any;
  let testingModule: TestingModule;

  beforeEach(async () => {
    global.fetch = jest.fn();

    selectWhereMock = jest.fn();
    updateWhereMock = jest.fn().mockResolvedValue([]);

    updateSetMock = jest.fn(() => ({ where: updateWhereMock }));
    insertValuesMock = jest.fn(() => ({
      returning: jest.fn().mockResolvedValue([{ id: 'log-1', attempts: 0 }]),
    }));

    dbMock = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({ where: selectWhereMock })),
      })),
      update: jest.fn(() => ({ set: updateSetMock })),
      insert: jest.fn(() => ({ values: insertValuesMock })),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        InventoryPostingService,
        { provide: DRIZZLE, useValue: dbMock },
        { provide: NotificationsService, useValue: { notifyRoles: jest.fn() } },
        {
          provide: InventoryClient,
          useValue: {
            postReceipt: jest.fn().mockResolvedValue({
              status: 200,
              json: async () => ({ transaction_id: 'TX-TEST' }),
            }),
          },
        },
      ],
    }).compile();

    service = testingModule.get<InventoryPostingService>(
      InventoryPostingService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const setupBaseSelects = () => {
    selectWhereMock
      .mockResolvedValueOnce([
        { id: 'grn-1', shipmentId: 'ship-1', grnNumber: 'GRN-001' },
      ]) // goodsReceipts
      .mockResolvedValueOnce([
        {
          shipmentItemId: 'si-1',
          acceptedQuantity: '10',
          perUnitLandedCostEtb: '150.00',
        },
      ]) // goodsReceiptItems
      .mockResolvedValueOnce([{ id: 'si-1', itemId: 'item-1' }]) // shipmentItems
      .mockResolvedValueOnce([{ shipmentItemId: 'si-1', ciValueEtb: '1000' }]); // importLandedCostResults
  };

  it('should set posted_to_inventory and transaction_id on successful ERP sync', async () => {
    setupBaseSelects();

    const inventoryClient = testingModule.get(InventoryClient);
    jest.spyOn(inventoryClient, 'postReceipt').mockResolvedValueOnce({
      transaction_id: 'ERP-INV-8080',
    } as any);

    const result = await service.post('grn-1');

    expect(result?.status).toBe('success');
    expect(result?.response?.transaction_id).toBe('ERP-INV-8080');

    // Verifies GRN Status update
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'posted' }),
    );

    // Verifies Landed Cost update
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        postedToInventory: true,
        inventoryTransactionId: 'ERP-INV-8080',
      }),
    );
  });

  it.skip('should set posting_failed and trigger system_admin notification on 500 FAIL_MODE', async () => {
    setupBaseSelects();

    // 5th query selects admins
    selectWhereMock.mockResolvedValueOnce([
      { id: 'admin-99', role: 'system_admin' },
    ]);

    const inventoryClient = testingModule.get(InventoryClient);
    jest
      .spyOn(inventoryClient, 'postReceipt')
      .mockRejectedValueOnce(
        new Error(
          'ERP responded with status 500: Internal Server Error (Simulated)',
        ),
      );

    await expect(service.post('grn-1')).rejects.toThrow(
      'ERP responded with status 500: Internal Server Error (Simulated)',
    );

    // Verifies GRN failure fallback status
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'posting_failed' }),
    );

    // Verifies the notification table push
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'admin-99',
          type: 'posting_failed',
          titleEn: 'ERP Inventory Sync Failed',
        }),
      ]),
    );
  });

  it('should successfully retry and sync previously failed GRN', async () => {
    setupBaseSelects();

    const inventoryClient = testingModule.get(InventoryClient);
    jest.spyOn(inventoryClient, 'postReceipt').mockResolvedValueOnce({
      transaction_id: 'ERP-INV-RETRY-01',
    } as any);

    const result = await service.post('grn-1');
    expect(result?.status).toBe('success');
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ inventoryTransactionId: 'ERP-INV-RETRY-01' }),
    );
  });
});
