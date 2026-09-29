import { Test, TestingModule } from '@nestjs/testing';
import { DutyPaymentsService } from './duty-payments.service';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { BadRequestException } from '@nestjs/common';

describe('DutyPaymentsService', () => {
  let service: DutyPaymentsService;
  let mockTx: any;
  let mockDb: any;
  let insertMock: jest.Mock;
  let updateMock: jest.Mock;
  let valuesMock: jest.Mock;

  beforeEach(async () => {
    valuesMock = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'payment-1' }]),
    });
    insertMock = jest.fn(() => ({ values: valuesMock }));
    updateMock = jest.fn(() => ({
      set: jest.fn().mockReturnValue({ where: jest.fn() }),
    }));

    mockTx = {
      query: {
        customsDeclarations: { findFirst: jest.fn() },
        policySettings: { findFirst: jest.fn() },
      },
      insert: insertMock,
      update: updateMock,
    };

    mockDb = {
      transaction: jest.fn((cb) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DutyPaymentsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<DutyPaymentsService>(DutyPaymentsService);
  });

  describe('record()', () => {
    it('should NOT raise variance flag when below tolerance, but should create journal entry', async () => {
      // Total Assessed = 1000
      mockTx.query.customsDeclarations.findFirst.mockResolvedValue({
        id: 'decl-1',
        status: 'assessed',
        totalAssessmentEtb: '1000.0000',
        declarationNumber: 'DEC-01',
      });
      // Policy = 5% tolerance
      mockTx.query.policySettings.findFirst.mockResolvedValue({
        key: 'duty_payment_tolerance_pct',
        valueNumeric: '5',
      });

      // Paid = 1040 (4% variance, which is < 5%)
      await service.record(
        'decl-1',
        {
          paymentDate: '2026-09-24',
          amountPaidEtb: 1040.0,
          receiptNumber: 'REC-123',
        },
        'user-1',
      );

      // Verify Duty Payments insertion
      expect(insertMock).toHaveBeenCalledWith(schema.dutyPayments);
      const paymentValues = valuesMock.mock.calls[0][0]; // First call to values()
      expect(paymentValues.isFlagged).toBe(false);
      expect(paymentValues.varianceVsAssessedEtb).toBe('40'); // 1040 - 1000 = 40

      // Verify Journal Entry creation
      expect(insertMock).toHaveBeenCalledWith(schema.erpSyncLog);
      const erpSyncValues = valuesMock.mock.calls[1][0]; // Second call to values()
      expect(erpSyncValues.entityType).toBe('journal_entry');
      expect(erpSyncValues.payload.journal_type).toBe('DUTY_PAYMENT');
      expect(erpSyncValues.payload.debitAccount).toBe('Customs Duty Expense');
      expect(erpSyncValues.payload.creditAccount).toBe('Bank Account');
      expect(erpSyncValues.payload.amount).toBe('1040');
      expect(erpSyncValues.payload.reference).toBe('REC-123');
    });

    it('should raise variance flag when above tolerance and create journal entry', async () => {
      // Total Assessed = 1000
      mockTx.query.customsDeclarations.findFirst.mockResolvedValue({
        id: 'decl-2',
        status: 'assessed',
        totalAssessmentEtb: '1000.0000',
        declarationNumber: 'DEC-02',
      });
      // Policy = 5% tolerance
      mockTx.query.policySettings.findFirst.mockResolvedValue({
        key: 'duty_payment_tolerance_pct',
        valueNumeric: '5',
      });

      // Paid = 1060 (6% variance, which is > 5%)
      await service.record(
        'decl-2',
        {
          paymentDate: '2026-09-24',
          amountPaidEtb: 1060.0,
          receiptNumber: 'REC-999',
        },
        'user-1',
      );

      // Verify Duty Payments insertion
      expect(insertMock).toHaveBeenCalledWith(schema.dutyPayments);
      const paymentValues = valuesMock.mock.calls[0][0];
      expect(paymentValues.isFlagged).toBe(true);
      expect(paymentValues.varianceVsAssessedEtb).toBe('60'); // 1060 - 1000 = 60

      // Verify Journal Entry creation
      expect(insertMock).toHaveBeenCalledWith(schema.erpSyncLog);
      const erpSyncValues = valuesMock.mock.calls[1][0];
      expect(erpSyncValues.entityType).toBe('journal_entry');
      expect(erpSyncValues.payload.amount).toBe('1060');
    });
  });
});
