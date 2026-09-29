import { SetMetadata } from '@nestjs/common';
import { Permission } from '../permissions';

export const permissions_key = 'permission';

export const RequiredPermission = (...permissions: Permission[]) =>
  SetMetadata(permissions_key, permissions);
