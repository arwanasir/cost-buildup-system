import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../permissions';
import {
  any_permissions_key,
  permissions_key,
} from '../decorators/permissions.decorator';
import { PermissionGuard } from './permissions.guards';

describe('PermissionGuard', () => {
  const approvalPermissions = [
    Permission.PO_APPROVE_TIER1,
    Permission.PO_APPROVE_TIER2,
    Permission.PO_APPROVE_TIER3,
  ];

  function createGuard(userPermissions: Permission[]) {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === permissions_key
          ? undefined
          : key === any_permissions_key
            ? approvalPermissions
            : undefined,
      ),
    } as unknown as Reflector;
    const db = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest
        .fn()
        .mockResolvedValue(
          userPermissions.map((permission) => ({ permission })),
        ),
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'finance_officer' } }),
      }),
    };

    return {
      guard: new PermissionGuard(reflector, db as any),
      context: context as any,
    };
  }

  it('allows an approver holding one of the tier permissions', async () => {
    const { guard, context } = createGuard([Permission.PO_APPROVE_TIER1]);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a user without an approval-tier permission', async () => {
    const { guard, context } = createGuard([Permission.PO_READ]);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
