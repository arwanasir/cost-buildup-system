import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../permissions';
import {
  any_permissions_key,
  permissions_key,
} from '../decorators/permissions.decorator';
import { DRIZZLE, DrizzleDB } from '../../db/db.token';
import { rolePermissions } from '../../db/schema/schema';
import { eq } from 'drizzle-orm';

import { Request } from 'express';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(DRIZZLE) private db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      permissions_key,
      [context.getHandler(), context.getClass()],
    );
    const requiredAnyPermissions = this.reflector.getAllAndOverride<Permission[]>(
      any_permissions_key,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredAnyPermissions || requiredAnyPermissions.length === 0)
    ) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { role?: string } }>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException(
        'User role not found or user not authenticated',
      );
    }

    const dbPermissions = await this.db
      .select({ permission: rolePermissions.permissionCode })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleCode, user.role));

    const userPermissions = dbPermissions.map(
      (row) => row.permission as Permission,
    );

    if (userPermissions.includes(Permission.ADMIN_ALL)) {
      return true;
    }
    const missingRequiredPermission = (requiredPermissions || []).some(
      (permission) => !userPermissions.includes(permission),
    );
    const missingAnyPermission =
      !!requiredAnyPermissions?.length &&
      !requiredAnyPermissions.some((permission) =>
        userPermissions.includes(permission),
      );
    if (missingRequiredPermission || missingAnyPermission) {
      const required = [
        ...(requiredPermissions || []),
        ...(requiredAnyPermissions || []),
      ];
      throw new ForbiddenException(
        `Access denied. Required permission: ${required.join(' or ')}`,
      );
    }
    return true;
  }
}
