import { Test, TestingModule } from '@nestjs/testing';
import { LettersOfCreditService } from './letters-of-credit.service';
import { LcStatusService } from './lc-status.service';
import { DRIZZLE } from '@/db';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { CreateLcDto } from './dto/create-lc.dto';

describe('Letters Of Credit Module Tests', () => {
  let lcService: LettersOfCreditService;
  let statusService: LcStatusService;
  let mockDb: any;
  let mockTx: any;

  beforeEach(async () => {
    mockTx = {
      query: {
        importPurchaseOrders: { findMany: jest.fn() },
        policySettings: { findFirst: jest.fn() },
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
      query: {
        lettersOfCredit: { findFirst: jest.fn() },
      },
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LettersOfCreditService,
        LcStatusService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    lcService = module.get<LettersOfCreditService>(LettersOfCreditService);
    statusService = module.get<LcStatusService>(LcStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('LettersOfCreditService', () => {
    it('should reject creation if any PO already has an LC (BR08)', async () => {
      mockTx.query.importPurchaseOrders.findMany.mockResolvedValue([
        { id: 'po1', supplierId: 'sup1', status: 'approved', lcId: null },
        {
          id: 'po2',
          supplierId: 'sup1',
          status: 'approved',
          lcId: 'existing-lc-id',
        }, // Fails BR08
      ]);

      const dto = { poIds: ['po1', 'po2'] } as any;

      await expect(lcService.create(dto, 'user1')).rejects.toThrow(
        new BadRequestException(
          'Purchase Order po2 already has an LC attached (BR08)',
        ),
      );
    });

    it('should validate dates correctly in CreateLcDto (DTO Date Validators)', async () => {
      const dto = new CreateLcDto();
      dto.openingDate = '2026-05-01';
      dto.expiryDate = '2026-04-01'; // Fails: must be after openingDate
      dto.lastShipmentDate = '2026-06-01'; // Fails: must be before expiryDate

      const errors = await validate(dto, { skipMissingProperties: true });
      const expiryError = errors.find((e) => e.property === 'expiryDate');
      const shipmentError = errors.find(
        (e) => e.property === 'lastShipmentDate',
      );

      expect(expiryError?.constraints?.isAfterDate).toBeDefined();
      expect(shipmentError?.constraints?.isBeforeDate).toBeDefined();
    });
  });

  describe('LcStatusService', () => {
    it('should block transition from applied to opened if GM approval is required but missing', async () => {
      mockTx.query.lettersOfCredit.findFirst.mockResolvedValue({
        id: 'lc1',
        status: 'applied',
        amountEtb: '1000000',
        gmApprovedBy: null,
      });

      mockTx.query.policySettings.findFirst.mockResolvedValue({
        valueNumeric: '500000', // threshold is 500k, amount is 1M
      });

      await expect(
        statusService.transition('lc1', 'opened', 'user1'),
      ).rejects.toThrow(
        new BadRequestException(
          'GM Approval is required before opening this LC',
        ),
      );
    });

    it('should allow transition from applied to opened if GM approval is met', async () => {
      mockTx.query.lettersOfCredit.findFirst.mockResolvedValue({
        id: 'lc1',
        status: 'applied',
        amountEtb: '1000000',
        gmApprovedBy: 'gm-user-id', // Approved!
      });

      mockTx.query.policySettings.findFirst.mockResolvedValue({
        valueNumeric: '500000',
      });

      mockTx.returning.mockResolvedValue([{ id: 'lc1', status: 'opened' }]);

      const result = await statusService.transition('lc1', 'opened', 'user1');
      expect(result.status).toBe('opened');
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('should enforce every status transition order (rejecting out-of-order)', async () => {
      mockTx.query.lettersOfCredit.findFirst.mockResolvedValue({
        id: 'lc1',
        status: 'applied', // currently applied
      });

      // Trying to jump to docs_received (invalid)
      await expect(
        statusService.transition('lc1', 'docs_received', 'user1'),
      ).rejects.toThrow(
        /Invalid status transition from applied to docs_received/,
      );
    });

    it('should allow every valid status transition order', async () => {
      // We can just verify ALLOWED_TRANSITIONS logic via unit test wrapper
      const validTransitions = [
        { from: 'applied', to: 'opened' },
        { from: 'opened', to: 'advised' },
        { from: 'advised', to: 'docs_submitted' },
        { from: 'docs_submitted', to: 'docs_received' },
        { from: 'docs_received', to: 'docs_checked' },
        { from: 'docs_checked', to: 'accepted' },
        { from: 'accepted', to: 'payment_authorised' },
        { from: 'payment_authorised', to: 'settled' },
      ];

      for (const t of validTransitions) {
        mockTx.query.lettersOfCredit.findFirst.mockResolvedValueOnce({
          id: 'lc_test',
          status: t.from,
          amountEtb: '100', // bypass GM gate
          gmApprovedBy: null,
        });
        mockTx.query.policySettings.findFirst.mockResolvedValueOnce({
          valueNumeric: '500',
        });
        mockTx.returning.mockResolvedValueOnce([
          { id: 'lc_test', status: t.to },
        ]);

        const result = await statusService.transition('lc_test', t.to, 'user1');
        expect(result.status).toBe(t.to);
      }
    });
  });
});
