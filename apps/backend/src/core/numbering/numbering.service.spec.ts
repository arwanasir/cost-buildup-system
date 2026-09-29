import { Test, TestingModule } from '@nestjs/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NumberingService } from './numbering.service';
import { DRIZZLE } from '@/db';

describe('NumberingService', () => {
  let service: NumberingService;
  let db: any;

  const mockDb = {
    execute: jest.fn(),
    query: {
      policySettings: {
        findFirst: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NumberingService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<NumberingService>(NumberingService);
    db = module.get(DRIZZLE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateNextNumber', () => {
    it('should generate a PO number with default prefix when setting is not found', async () => {
      // Mock sequence result for raw SQL
      db.execute.mockResolvedValue({ rows: [{ nextval: '12' }] });

      // Mock setting not found (null)
      db.query.policySettings.findFirst.mockResolvedValue(null);

      const result = await service.generateNextNumber('po');

      expect(result).toBe('PO-00012');
      expect(db.execute).toHaveBeenCalled();
      expect(db.query.policySettings.findFirst).toHaveBeenCalled();
    });

    it('should generate a SHP number with a custom prefix from settings', async () => {
      // Mock sequence result
      db.execute.mockResolvedValue({ rows: [{ nextval: '5' }] });

      // Mock custom prefix found in db
      db.query.policySettings.findFirst.mockResolvedValue({
        key: 'shipment_number_prefix',
        valueText: 'IMP-SHP-',
      });

      const result = await service.generateNextNumber('shipment');

      expect(result).toBe('IMP-SHP-00005');
    });

    it('should properly pad sequence numbers up to 5 digits', async () => {
      db.execute.mockResolvedValue({ rows: [{ nextval: '9999' }] });
      db.query.policySettings.findFirst.mockResolvedValue(null);

      const result = await service.generateNextNumber('lc');
      expect(result).toBe('LC-09999');
    });
  });
});
