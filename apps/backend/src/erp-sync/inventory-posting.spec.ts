import { Test, TestingModule } from '@nestjs/testing';
import { InventoryPostingService } from './inventory-posting.service';
import { DRIZZLE } from '@/db/db.token';
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
            postCostAdjustment: jest.fn().mockResolvedValue({
              status: 'posted',
              inventory_transaction_id: 'ERP-INV-ADJ-001',
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

  const setupBaseSelects = (usesEstimatedCost = false) => {
    selectWhereMock
      .mockResolvedValueOnce([
        {
          id: 'grn-1',
          shipmentId: 'ship-1',
          grnNumber: 'GRN-001',
          usesEstimatedCost,
        },
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

  it('preserves the adjustment flag when inventory was posted using estimates', async () => {
    setupBaseSelects(true);
    const inventoryClient = testingModule.get(InventoryClient);
    jest.spyOn(inventoryClient, 'postReceipt').mockResolvedValueOnce({
      transaction_id: 'ERP-INV-ESTIMATE',
    } as any);

    await service.post('grn-1');

    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'flagged_for_adjustment',
      }),
    );
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        postedToInventory: true,
        inventoryTransactionId: 'ERP-INV-ESTIMATE',
      }),
    );
  });

  it('should set posting_failed and trigger system_admin notification on ERP 500', async () => {
    setupBaseSelects();

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

    // Failed ERP sync is surfaced through the configured notification channels.
    const notificationsService = testingModule.get(NotificationsService);
    expect(notificationsService.notifyRoles).toHaveBeenCalledWith(
      'posting_failed',
      { type: 'goods_receipt', id: 'grn-1' },
      expect.objectContaining({ entityName: 'GRN GRN-001' }),
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

  it('posts approved final unit costs and stores the ERP adjustment reference', async () => {
    selectWhereMock
      .mockResolvedValueOnce([
        {
          id: 'grn-1',
          shipmentId: 'ship-1',
          grnNumber: 'GRN-001',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'grn-item-1',
          shipmentItemId: 'si-1',
          acceptedQuantity: '2',
          perUnitLandedCostEtb: '10.0000',
        },
      ])
      .mockResolvedValueOnce([{ id: 'si-1', itemId: 'item-1' }])
      .mockResolvedValueOnce([
        {
          shipmentItemId: 'si-1',
          ciValueEtb: '20.0000',
          customsDutyEtb: '2.0000',
          importVatEtb: '3.3000',
          freightAllocatedEtb: '0.0000',
          insuranceAllocatedEtb: '0.0000',
          bankChargesAllocatedEtb: '0.0000',
          portChargesAllocatedEtb: '0.0000',
          clearingFeeAllocatedEtb: '0.0000',
          otherChargesAllocatedEtb: '0.0000',
          totalLandedCostEtb: '25.3000',
          perUnitLandedCostEtb: '12.6500',
          postedToInventory: true,
        },
      ]);

    const inventoryClient = testingModule.get(InventoryClient);
    const result = await service.postFinalCostAdjustment('grn-1', 'journal-1');

    expect(inventoryClient.postCostAdjustment).toHaveBeenCalledWith(
      'journal-1',
      'GRN-001',
      'ship-1',
      [
        expect.objectContaining({
          item_id: 'item-1',
          quantity_received: '2.0000',
          previous_per_unit_landed_cost_etb: '10.0000',
          per_unit_landed_cost_etb: '12.6500',
          line_value_etb: '25.3000',
        }),
      ],
    );
    expect(updateSetMock).toHaveBeenCalledWith({
      inventoryAdjustmentTransactionId: 'ERP-INV-ADJ-001',
    });
    expect(result.inventory_transaction_id).toBe('ERP-INV-ADJ-001');
  });
});
