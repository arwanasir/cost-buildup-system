import { Test, TestingModule } from '@nestjs/testing';
import { InventoryPostingService } from './inventory-posting.service';
import { InventoryClient } from './clients/inventory.client';
import { NotificationsService } from '../notifications/notifications.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DRIZZLE } from '@/db';
const nock = require('nock');

describe('ERP Sync Integration (Nock)', () => {
  let inventoryService: InventoryPostingService;
  let dbMock: any;
  let notifySpy: jest.SpyInstance;

  beforeAll(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'log-1', attempts: 0 }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        InventoryPostingService,
        InventoryClient,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
        {
          provide: NotificationsService,
          useValue: { notifyRoles: jest.fn() },
        },
      ],
    }).compile();

    inventoryService = module.get<InventoryPostingService>(
      InventoryPostingService,
    );

    // Stub getPayloadForGrn to avoid complex DB selects
    jest.spyOn(inventoryService, 'getPayloadForGrn').mockResolvedValue({
      items: [{ grn_id: 'GRN-001', quantity_received: '10' }],
      grn: { grnNumber: 'GRN-001', id: 'grn-1' },
    } as any);

    notifySpy = jest.spyOn(module.get(NotificationsService), 'notifyRoles');
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  it('1. Success on first attempt', async () => {
    nock('http://localhost:3001')
      .post('/inventory/postings')
      .reply(200, { transaction_id: 'TX-123' });

    dbMock.returning.mockResolvedValueOnce([{ id: 'log-1', attempts: 0 }]);
    dbMock.where.mockResolvedValue([]); // For the update where clause

    const result = await inventoryService.post('grn-1');
    expect(result).toEqual({
      status: 'success',
      response: { transaction_id: 'TX-123' },
    });

    // Ensure update was called with success
    expect(dbMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
    );
  });

  it('2. Retry then success', async () => {
    // First attempt fails
    nock('http://localhost:3001')
      .post('/inventory/postings')
      .reply(500, { error: 'Internal Server Error' });

    dbMock.returning.mockResolvedValueOnce([{ id: 'log-2', attempts: 0 }]);

    await expect(inventoryService.post('grn-1')).rejects.toThrow();

    // Verify it was marked as pending (for retry)
    expect(dbMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', attempts: 1 }),
    );

    // Now SyncDispatcher or manual retry triggers it again with existingLogId
    // Second attempt succeeds
    nock('http://localhost:3001')
      .post('/inventory/postings')
      .reply(200, { transaction_id: 'TX-456' });

    dbMock.where.mockResolvedValueOnce([{ id: 'log-2', attempts: 1 }]); // mock existing log fetch

    const result = await inventoryService.post('grn-1', 'log-2');
    expect(result).toEqual({
      status: 'success',
      response: { transaction_id: 'TX-456' },
    });

    // Verify it was marked as success
    expect(dbMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', attempts: 2 }),
    );
  });

  it('3. Permanent failure (exhaustion)', async () => {
    nock('http://localhost:3001')
      .post('/inventory/postings')
      .reply(500, { error: 'Still failing' });

    // Mock existing log with 2 attempts (meaning next one is the 3rd and final attempt)
    dbMock.where.mockResolvedValueOnce([{ id: 'log-3', attempts: 2 }]);

    await expect(inventoryService.post('grn-1', 'log-3')).rejects.toThrow();

    // Verify it was marked as failed
    expect(dbMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', attempts: 3 }),
    );

    // Verify notification was sent
    expect(notifySpy).toHaveBeenCalledWith(
      'posting_failed',
      expect.anything(),
      expect.anything(),
    );
  });
});
