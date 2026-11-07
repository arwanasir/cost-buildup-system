import { AuditInterceptor } from './audit.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { AUDITED_ENTITY_KEY } from './audited.decorator';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflectorMock: any;
  let auditServiceMock: any;
  let dbMock: any;

  beforeEach(() => {
    reflectorMock = {
      get: jest.fn().mockImplementation((key, target) => {
        if (key === AUDITED_ENTITY_KEY) return 'importPurchaseOrders';
        return null;
      }),
    };

    auditServiceMock = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: 'po-123', status: 'draft' }]),
    };

    interceptor = new AuditInterceptor(reflectorMock, auditServiceMock, dbMock);
  });

  it('should capture before/after values, IP, and correlationId on PO update', async () => {
    const mockRequest = {
      method: 'PATCH',
      path: '/purchase-orders/po-123',
      params: { id: 'po-123' },
      user: { id: 'user-789' },
      clientIp: '192.168.1.50',
      correlationId: 'req-corr-uuid',
    };

    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: jest
        .fn()
        .mockReturnValue(of({ id: 'po-123', status: 'ordered' })),
    };

    const observable = await interceptor.intercept(
      mockContext,
      mockCallHandler,
    );

    await new Promise((resolve, reject) => {
      observable.subscribe({
        next: (v: any) => {},
        error: (e: any) => reject(e),
        complete: () => resolve(undefined),
      });
    });

    expect(auditServiceMock.record).toHaveBeenCalledTimes(1);
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      entityType: 'importPurchaseOrders',
      entityId: 'po-123',
      action: 'update',
      actorId: 'user-789',
      ip: '192.168.1.50',
      correlationId: 'req-corr-uuid',
      before: { id: 'po-123', status: 'draft' },
      after: { id: 'po-123', status: 'ordered' },
    });
  });

  it('awaits audit persistence and resolves created IDs from wrapped responses', async () => {
    reflectorMock.get.mockReturnValue('items');
    const mockRequest = {
      method: 'POST',
      path: '/items',
      params: {},
      user: { id: 'user-1' },
      ip: '127.0.0.1',
    };
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    let finishRecord!: () => void;
    auditServiceMock.record.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishRecord = resolve;
      }),
    );
    const mockCallHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: { id: 'item-123' } })),
    };
    const observable = await interceptor.intercept(
      mockContext,
      mockCallHandler,
    );
    let emitted = false;
    const completion = new Promise<void>((resolve, reject) => {
      observable.subscribe({
        next: () => {
          emitted = true;
        },
        error: reject,
        complete: resolve,
      });
    });

    expect(auditServiceMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'items',
        entityId: 'item-123',
        actorId: 'user-1',
        ip: '127.0.0.1',
      }),
    );
    expect(emitted).toBe(false);
    finishRecord();
    await completion;
    expect(emitted).toBe(true);
  });
});
