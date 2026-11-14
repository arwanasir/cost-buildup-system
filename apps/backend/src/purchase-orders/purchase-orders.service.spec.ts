import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrdersService } from './purchase-orders.service';
import { ApprovalRoutingService } from './approval-routing.service';
import { PoStatusService } from './po-status.service';
import { PoCalculationService } from './po-calculation.service';
import { NumberingService } from '@/core/numbering/numbering.service';
import { DRIZZLE } from '@/db/db.token';
import { BadRequestException } from '@nestjs/common';

describe('Purchase Orders Workflow', () => {
  let poService: PurchaseOrdersService;
  let approvalRoutingService: ApprovalRoutingService;
  let poStatusService: PoStatusService;

  const mockSet = jest.fn().mockReturnThis();
  const mockWhere = jest.fn().mockReturnThis();
  const mockValues = jest.fn().mockReturnThis();
  const mockReturning = jest.fn().mockReturnThis();

  const mockTx = {
    query: {
      importPurchaseOrders: { findFirst: jest.fn() },
      poApprovals: { findFirst: jest.fn() },
      users: { findFirst: jest.fn(), findMany: jest.fn() },
      nbeExchangeRates: { findFirst: jest.fn() },
      policySettings: { findFirst: jest.fn() },
    },
    update: jest.fn().mockReturnValue({
      set: mockSet,
      where: mockWhere,
      returning: mockReturning,
    }),
    insert: jest
      .fn()
      .mockReturnValue({ values: mockValues, returning: mockReturning }),
  };

  const mockDb = {
    transaction: jest.fn(async (cb) => cb(mockTx)),
    query: mockTx.query,
    update: mockTx.update,
    insert: mockTx.insert,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NumberingService,
          useValue: {
            generatePoNumber: jest.fn().mockResolvedValue('PO-TEST-001'),
          },
        },
        PurchaseOrdersService,
        ApprovalRoutingService,
        PoStatusService,
        PoCalculationService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    poService = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    approvalRoutingService = module.get<ApprovalRoutingService>(
      ApprovalRoutingService,
    );
    poStatusService = module.get<PoStatusService>(PoStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ApprovalRoutingService: Routing by threshold', () => {
    it('routes by ETB value using the configured upper threshold', async () => {
      mockDb.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        currency: 'USD',
        totalValueForeign: '150000',
        totalValueEtb: '18000000',
      });
      // Mock thresholds
      mockDb.query.policySettings.findFirst
        .mockResolvedValueOnce({ valueNumeric: '1000000' }) // t1 ETB
        .mockResolvedValueOnce({ valueNumeric: '5000000' }); // t2 ETB

      const role =
        await approvalRoutingService.determineRequiredApproverRole('po-1');
      expect(role).toEqual('general_manager');
    });

    it('routes foreign-currency POs using their stored ETB value', async () => {
      mockDb.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        currency: 'EUR',
        totalValueEtb: '9000',
      });
      mockDb.query.policySettings.findFirst
        .mockResolvedValueOnce({ valueNumeric: '10000' }) // t1 ETB
        .mockResolvedValueOnce({ valueNumeric: '50000' }); // t2 ETB

      const role =
        await approvalRoutingService.determineRequiredApproverRole('po-1');
      expect(role).toEqual('finance_officer');
    });

    it('routes an ETB PO at the first threshold to finance_manager', async () => {
      mockDb.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        currency: 'ETB',
        totalValueEtb: '10000',
      });
      mockDb.query.policySettings.findFirst
        .mockResolvedValueOnce({ valueNumeric: '10000' })
        .mockResolvedValueOnce({ valueNumeric: '50000' });

      await expect(
        approvalRoutingService.determineRequiredApproverRole('po-1'),
      ).resolves.toBe('finance_manager');
    });

    it('routes a PO exactly at the upper threshold to finance_manager', async () => {
      mockDb.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        currency: 'ETB',
        totalValueEtb: '50000',
      });
      mockDb.query.policySettings.findFirst
        .mockResolvedValueOnce({ valueNumeric: '10000' })
        .mockResolvedValueOnce({ valueNumeric: '50000' });

      await expect(
        approvalRoutingService.determineRequiredApproverRole('po-1'),
      ).resolves.toBe('finance_manager');
    });
  });

  describe('PurchaseOrdersService: Approval Roles & Clearances', () => {
    it('stores both English and Amharic PO approval-request notification text', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        poNumber: 'PO-00001',
        status: 'draft',
      });
      mockTx.query.users.findMany.mockResolvedValueOnce([{ id: 'approver-1' }]);
      jest
        .spyOn(approvalRoutingService, 'determineRequiredApproverRole')
        .mockResolvedValueOnce('finance_manager');

      await poService.submit('po-1', 'creator-1');

      const notificationRows =
        mockValues.mock.calls[mockValues.mock.calls.length - 1]?.[0];
      expect(notificationRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            titleAm: expect.stringContaining('PO-00001'),
            bodyAm: expect.stringContaining('PO-00001'),
          }),
        ]),
      );
    });

    it('should throw BadRequestException if creator tries to approve their own PO (AC10)', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        status: 'pending_approval',
        createdBy: 'user-creator', // Same as actor
        poApprovals: [
          { id: 'app-1', decision: null, requiredRole: 'finance_manager' },
        ],
      });

      await expect(
        poService.approve('po-1', 'user-creator', 'LGTM'),
      ).rejects.toThrow(
        'Creator cannot approve their own Purchase Order (AC10)',
      );
    });

    it('should allow finance_officer to approve PO under threshold_1', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-under',
        status: 'pending_approval',
        createdBy: 'procurement-user',
        poApprovals: [
          { id: 'app-1', decision: null, requiredRole: 'finance_officer' },
        ],
      });

      mockTx.query.users.findFirst.mockResolvedValueOnce({
        id: 'finance-officer-user',
        role: 'finance_officer', // 30 >= 30
      });

      jest.spyOn(poService, 'findOne').mockResolvedValueOnce({} as any);

      await poService.approve('po-under', 'finance-officer-user', 'Looks good');

      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'approved' }),
      );
    });

    it('should block finance_officer (400/403) from approving PO over threshold_2', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-over',
        status: 'pending_approval',
        createdBy: 'procurement-user',
        poApprovals: [
          { id: 'app-1', decision: null, requiredRole: 'general_manager' },
        ], // Threshold 2
      });

      mockTx.query.users.findFirst.mockResolvedValueOnce({
        id: 'finance-officer-user',
        role: 'finance_officer', // 30 < 50
      });

      await expect(
        poService.approve(
          'po-over',
          'finance-officer-user',
          'Approving large PO',
        ),
      ).rejects.toThrow(
        /Role finance_officer does not meet required role general_manager/,
      );
    });

    it('should allow general_manager to approve PO over threshold_2', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-over',
        status: 'pending_approval',
        createdBy: 'procurement-user',
        poApprovals: [
          { id: 'app-1', decision: null, requiredRole: 'general_manager' },
        ], // Threshold 2
      });

      mockTx.query.users.findFirst.mockResolvedValueOnce({
        id: 'gm-user',
        role: 'general_manager', // 50 >= 50
      });

      jest.spyOn(poService, 'findOne').mockResolvedValueOnce({} as any);

      await poService.approve('po-over', 'gm-user', 'GM Approved');

      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'approved' }),
      );
    });
  });
  describe('PurchaseOrdersService: Rejection returns to draft', () => {
    it('should change status back to draft and record rejection', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        status: 'pending_approval',
        createdBy: 'creator-user',
        poApprovals: [
          { id: 'app-1', decision: null, requiredRole: 'finance_manager' },
        ],
      });

      mockTx.query.users.findFirst.mockResolvedValueOnce({
        id: 'actor-user',
        role: 'finance_manager', // Meets requirement
      });

      // Avoid actual returning error by mocking findOne called at the end
      jest.spyOn(poService, 'findOne').mockResolvedValueOnce({} as any);

      await poService.reject('po-1', 'actor-user', 'Missing budget code');

      // Verify poApprovals was updated to 'rejected'
      expect(mockTx.update).toHaveBeenCalledTimes(2); // One for approvals, one for PO
      // Second update is the PO status update
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' }),
      );
      // First update is the approval record
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'rejected',
          comment: 'Missing budget code',
        }),
      );
    });

    it('should throw if comment is missing during rejection', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        status: 'pending_approval',
        createdBy: 'creator-user',
        poApprovals: [
          { id: 'app-1', decision: null, requiredRole: 'finance_manager' },
        ],
      });
      await expect(poService.reject('po-1', 'actor-user', '')).rejects.toThrow(
        'A comment is required',
      );
    });
  });

  describe('PoStatusService: Partially received transition (FR-02.3)', () => {
    it('should compute partially_received if some receivedQuantity < quantity', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        status: 'shipped',
        poLines: [
          { quantity: '10', receivedQuantity: '10' },
          { quantity: '5', receivedQuantity: '3' }, // Partially received
        ],
      });

      const res = await poStatusService.transition(
        'po-1',
        'partially_received',
        'actor-user',
      );
      expect(res.newStatus).toEqual('partially_received');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'partially_received' }),
      );
    });

    it('should compute fully_received if all receivedQuantity >= quantity', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        status: 'shipped',
        poLines: [
          { quantity: '10', receivedQuantity: '10' },
          { quantity: '5', receivedQuantity: '5' },
        ],
      });

      const res = await poStatusService.transition(
        'po-1',
        'partially_received',
        'actor-user',
      );
      expect(res.newStatus).toEqual('fully_received');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'fully_received' }),
      );
    });

    it('should block transition to received if nothing is received', async () => {
      mockTx.query.importPurchaseOrders.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        status: 'shipped',
        poLines: [{ quantity: '10', receivedQuantity: '0' }],
      });

      await expect(
        poStatusService.transition('po-1', 'partially_received', 'actor-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
