import 'reflect-metadata';
import { CostCategoriesController } from './cost-categories.controller';
import { permissions_key } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';

describe('CostCategoriesController permissions', () => {
  const prototype = CostCategoriesController.prototype;

  it('allows users with cost:read to load categories', () => {
    expect(Reflect.getMetadata(permissions_key, prototype.findAll)).toEqual([
      Permission.COST_READ,
    ]);
    expect(Reflect.getMetadata(permissions_key, prototype.findOne)).toEqual([
      Permission.COST_READ,
    ]);
  });

  it('keeps category changes restricted to system administrators', () => {
    expect(Reflect.getMetadata(permissions_key, prototype.create)).toEqual([
      Permission.ADMIN_ALL,
    ]);
    expect(Reflect.getMetadata(permissions_key, prototype.update)).toEqual([
      Permission.ADMIN_ALL,
    ]);
    expect(Reflect.getMetadata(permissions_key, prototype.remove)).toEqual([
      Permission.ADMIN_ALL,
    ]);
  });
});
