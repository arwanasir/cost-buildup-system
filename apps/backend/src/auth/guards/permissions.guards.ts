import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Role } from '../permissions';
import { permissions_key } from '../decorators/permissions.decorator';
import { DRIZZLE, DrizzleDB } from '../../db/db.module';
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

    if (!requiredPermissions || requiredPermissions.length === 0) {
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
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied.Missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }
    return true;
  }
}
