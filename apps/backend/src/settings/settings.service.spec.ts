import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { DRIZZLE } from '@/db';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SettingsService', () => {
  let service: SettingsService;
  let db: any;
  let mockTx: any;

  beforeEach(async () => {
    mockTx = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue([]),
    };

    const mockDb = {
      query: {
        policySettings: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      transaction: jest.fn((cb) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    db = module.get(DRIZZLE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all settings', async () => {
      const mockSettings = [
        { id: '1', key: 'po_approval_threshold_1', valueNumeric: '5000' },
      ];
      db.query.policySettings.findMany.mockResolvedValue(mockSettings);

      const result = await service.findAll();
      expect(result).toEqual(mockSettings);
      expect(db.query.policySettings.findMany).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if valueNumeric is not a number', async () => {
      await expect(
        service.update(
          'test_key',
          { valueNumeric: 'not-a-number' } as any,
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if setting does not exist', async () => {
      db.query.policySettings.findFirst.mockResolvedValue(null);
      await expect(
        service.update('unknown', { valueNumeric: 10 }, 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update the setting and create an audit log inside a transaction', async () => {
      const mockSetting = { id: '1', key: 'test_key', valueNumeric: '10' };
      const updatedSetting = { id: '1', key: 'test_key', valueNumeric: '20' };

      db.query.policySettings.findFirst.mockResolvedValue(mockSetting);
      mockTx.returning.mockResolvedValue([updatedSetting]);

      const result = await service.update(
        'test_key',
        { valueNumeric: 20 },
        'user1',
      );

      expect(result).toEqual(updatedSetting);
      expect(db.transaction).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled(); // Audit ledger insert
    });
  });
});
