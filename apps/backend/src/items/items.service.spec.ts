import { Test, TestingModule } from '@nestjs/testing';
import { ItemsService } from './items.service';
import { DRIZZLE } from '@/db';
import { ConflictException } from '@nestjs/common';

describe('ItemsService', () => {
  let service: ItemsService;
  let db: any;

  const returningInsertMock = jest.fn();
  const valuesInsertMock = jest
    .fn()
    .mockReturnValue({ returning: returningInsertMock });
  const insertMock = jest.fn().mockReturnValue({ values: valuesInsertMock });

  const mockDb = {
    query: {
      items: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    },
    insert: insertMock,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
    db = module.get(DRIZZLE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create an item', async () => {
      db.query.items.findFirst.mockResolvedValue(null);
      returningInsertMock.mockResolvedValue([
        { id: 'item-1', itemCode: 'ITM-001' },
      ]);

      const result = await service.create(
        {
          itemCode: 'ITM-001',
          name: 'Steel Pipe',
          unitOfMeasure: 'PCS',
        },
        'user-1',
      );

      expect(db.query.items.findFirst).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
      expect(result).toEqual({ id: 'item-1', itemCode: 'ITM-001' });
    });

    it('should throw ConflictException if itemCode already exists', async () => {
      db.query.items.findFirst.mockResolvedValue({
        id: 'item-1',
        itemCode: 'ITM-001',
      });

      await expect(
        service.create(
          {
            itemCode: 'ITM-001',
            name: 'Another Steel Pipe',
            unitOfMeasure: 'PCS',
          },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('searchTypeahead', () => {
    it('should return up to 20 active items matching search query', async () => {
      db.query.items.findMany.mockResolvedValue([
        { id: '1', itemCode: 'ITM-001', name: 'Steel Pipe' },
      ]);

      const result = await service.searchTypeahead('Steel');

      expect(result).toHaveLength(1);
      expect(result[0].itemCode).toBe('ITM-001');

      const callArg = db.query.items.findMany.mock.calls[0][0];
      expect(callArg.limit).toBe(20);
      expect(callArg.columns).toEqual({ id: true, itemCode: true, name: true });
    });
  });
});
