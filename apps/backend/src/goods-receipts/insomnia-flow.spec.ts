import { Test, TestingModule } from '@nestjs/testing';
import { GoodsReceiptsService } from './goods-receipts.service';
import { FinancePostingService } from '@/erp-sync/finance-posting.service';
import { InventoryPostingService } from '@/erp-sync/inventory-posting.service';
import { QuantityDiscrepancyService } from './quantity-discrepancy.service';
import { LandedCostService } from '@/landed-cost/landed-cost.service';
import { DRIZZLE } from '@/db';
import { NotificationsService } from '@/notifications/notifications.service';
import { FinanceClient } from '@/erp-sync/clients/finance.client';
import { InventoryClient } from '@/erp-sync/clients/inventory.client';

describe.skip('Insomnia Flow: GRN Rejection and ERP Posting Verification', () => {
  let grnService: GoodsReceiptsService;
  let dbMock: any;
  let inventoryMock: jest.Mock;
  let financeMock: jest.Mock;

  beforeEach(async () => {
    inventoryMock = jest
      .fn()
      .mockResolvedValue({ transaction_id: 'ERP-INV-12345' });
    financeMock = jest
      .fn()
      .mockResolvedValue({ transaction_id: 'ERP-FIN-12345' });

    const whereMock = jest.fn((condition) => {
      return [
        {
          id: 'mock-grn-1',
          shipmentId: 'ship-123',
          status: 'draft',
          grnNumber: 'GRN-999',
          isFinalised: false,
          usesEstimatedCost: true,
          // Items table
          shipmentItemId: 'item-valid',
          acceptedQuantity: '100',
          rejectedQuantity: '0',
          receivedQuantity: '100',
          perUnitLandedCostEtb: '15.00',
          shippedQuantity: '100',
          quantity: '100',
          // LC results table
          ciValueEtb: '1000.00',
          totalLandedCostEtb: '1500.00',
          // User table
          role: 'finance_manager',
          // joined table struct
          goods_receipt_items: {
            acceptedQuantity: '100',
            rejectedQuantity: '0',
          },
        },
        {
          id: 'mock-grn-2',
          shipmentId: 'ship-123',
          status: 'draft',
          grnNumber: 'GRN-999',
          isFinalised: false,
          usesEstimatedCost: true,
          // Items table
          shipmentItemId: 'item-rejected',
          acceptedQuantity: '0',
          rejectedQuantity: '100',
          receivedQuantity: '100',
          perUnitLandedCostEtb: '15.00',
          shippedQuantity: '100',
          quantity: '100',
          // LC results table
          ciValueEtb: '1000.00',
          totalLandedCostEtb: '1500.00',
          // User table
          role: 'system_admin',
          // joined table struct
          goods_receipt_items: {
            acceptedQuantity: '0',
            rejectedQuantity: '100',
          },
        },
      ];
    });

    const chain: any = { where: whereMock };
    chain.innerJoin = jest.fn(() => chain);
    const fromMock = jest.fn(() => chain);

    dbMock = {
      select: jest.fn(() => ({ from: fromMock })),
      insert: jest.fn(() => ({
        values: jest.fn(() => ({
          returning: jest.fn().mockResolvedValue([{ id: 'new-id' }]),
        })),
      })),
      update: jest.fn(() => ({ set: jest.fn(() => ({ where: whereMock })) })),
      transaction: jest.fn(async (cb) => cb(dbMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptsService,
        FinancePostingService,
        InventoryPostingService,
        {
          provide: QuantityDiscrepancyService,
          useValue: { analyzeAndStoreDiscrepancies: jest.fn() },
        },
        { provide: LandedCostService, useValue: { computeDraft: jest.fn() } },
        { provide: DRIZZLE, useValue: dbMock },
        { provide: NotificationsService, useValue: { notifyRoles: jest.fn() } },
        { provide: FinanceClient, useValue: { postTransaction: financeMock } },
        { provide: InventoryClient, useValue: { postReceipt: inventoryMock } },
      ],
    }).compile();

    grnService = module.get<GoodsReceiptsService>(GoodsReceiptsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.skip('should run the insomnia flow: confirm GRN, post, and verify only accepted lines are posted to ERP', async () => {
    await grnService.confirmGrn('mock-grn-1', 'user-1');

    expect(inventoryMock).toHaveBeenCalledTimes(1);
    expect(financeMock).toHaveBeenCalledTimes(1);

    const inventoryPayload = inventoryMock.mock.calls[0][0];

    expect(inventoryPayload).toHaveLength(1);
    expect(inventoryPayload[0].shipment_item_id).toBe('item-valid');
    expect(inventoryPayload[0].quantity_received).toBe('100');

    const financePayload = financeMock.mock.calls[0][0];

    expect(financePayload.lines).toHaveLength(3);
    const debitLine = financePayload.lines.find(
      (l: any) => l.account_code === '1000-INV',
    );
    expect(debitLine.debit).toBe('1500.0000');
  });
});
