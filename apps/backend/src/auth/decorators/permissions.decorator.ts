import { SetMetadata } from '@nestjs/common';
import { Permission } from '../permissions';

export const permissions_key = 'permission';
export const any_permissions_key = 'any_permission';

export const RequiredPermission = (...permissions: Permission[]) =>
  SetMetadata(permissions_key, permissions);

export const RequiredAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(any_permissions_key, permissions);
