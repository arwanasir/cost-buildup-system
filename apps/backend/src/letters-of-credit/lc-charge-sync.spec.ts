import { Test, TestingModule } from '@nestjs/testing';
import { LcChargeSyncListener } from './lc-charge-sync.listener';
import { DRIZZLE } from '@/db';
import { Logger } from '@nestjs/common';

describe('LcChargeSyncListener', () => {
  let listener: LcChargeSyncListener;
  let mockDb: any;
  let mockTx: any;

  beforeEach(async () => {
    mockTx = {
      query: {
        costCategories: { findFirst: jest.fn() },
        importShipments: { findMany: jest.fn() },
        lcBankCharges: { findMany: jest.fn() },
        lettersOfCredit: { findFirst: jest.fn() },
      },
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn(),
    };

    mockDb = {
      transaction: jest.fn(async (cb) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LcChargeSyncListener, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    listener = module.get<LcChargeSyncListener>(LcChargeSyncListener);

    // Suppress logs for clean test output
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('charge creates exactly one cost entry per linked shipment with amount_etb equal to the charge', async () => {
    // Mock 1 shipment so amount_etb perfectly equals the full charge amount
    mockTx.query.costCategories.findFirst.mockResolvedValue({
      id: 'cat-bank-charge',
    });
    mockTx.query.importShipments.findMany.mockResolvedValue([{ id: 'ship-1' }]);
    mockTx.returning.mockResolvedValue([{ id: 'cost-entry-1' }]);

    await listener.handleLcChargeRecordedEvent({
      lcId: 'lc-123',
      chargeId: 'charge-456',
      chargeType: 'opening_fee',
      amountEtb: '1000',
      issuingBank: 'Bank A',
      createdBy: 'user1',
    });

    expect(mockTx.insert).toHaveBeenCalled();
    const insertArgs = mockTx.values.mock.calls[0][0]; // Array of cost entries
    expect(insertArgs).toHaveLength(1);
    expect(insertArgs[0].shipmentId).toBe('ship-1');
    expect(insertArgs[0].amountEtb).toBe('1000'); // amount_etb strictly equals the charge!

    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.set).toHaveBeenCalledWith({
      registerEntryId: 'cost-entry-1',
    });
  });

  it('unsynced charge pulled when shipment is created later', async () => {
    mockTx.query.lcBankCharges.findMany.mockResolvedValue([
      {
        id: 'unsynced-charge-1',
        chargeType: 'amendment_fee',
        amountEtb: '350',
      },
    ]);
    mockTx.query.costCategories.findFirst.mockResolvedValue({
      id: 'cat-bank-charge',
    });
    mockTx.query.lettersOfCredit.findFirst.mockResolvedValue({
      id: 'lc-123',
      issuingBank: 'Bank B',
    });

    mockTx.returning.mockResolvedValue([{ id: 'cost-entry-2' }]);

    await listener.handleShipmentCreatedEvent({
      shipmentId: 'ship-new',
      lcId: 'lc-123',
      createdBy: 'user2',
    });

    expect(mockTx.insert).toHaveBeenCalled();
    const insertArgs = mockTx.values.mock.calls[0][0]; // Object literal for single charge loop
    expect(insertArgs.shipmentId).toBe('ship-new');
    expect(insertArgs.amountEtb).toBe('350');
    expect(insertArgs.providerName).toBe('Bank B');

    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.set).toHaveBeenCalledWith({
      registerEntryId: 'cost-entry-2',
    });
  });
});
