import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { Permission, Role, RolePermission } from "../permissions";
import { permissions_key } from "../decorators/permissions.decorator";


@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(private reflector: Reflector) { }
    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
            permissions_key, [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.role) {
            throw new ForbiddenException('User role not found or user not authenticated');
        }
        const userPermissions = RolePermission[user.role as Role] || [];
        if (userPermissions.includes(Permission.ADMIN_ALL)) {
            return true;
        }
        const hasPermission = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        );
        if (!hasPermission) {
            throw new ForbiddenException(`Access denied.Missing required permissions: ${requiredPermissions.join(', ')}`);
        }
        return true;
    }
}