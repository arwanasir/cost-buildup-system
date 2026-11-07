import { Test, TestingModule } from '@nestjs/testing';
import { CustomsController } from './customs.controller';
import { CustomsService } from './customs.service';
import { DutyPaymentsService } from './duty-payments.service';
import { DRIZZLE } from '../db/db.token';
import { permissions_key } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';

describe('CustomsController', () => {
  let controller: CustomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomsController],
      providers: [
        {
          provide: DRIZZLE,
          useValue: {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: CustomsService, useValue: {} },
        { provide: DutyPaymentsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CustomsController>(CustomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses customs permissions for declaration reads and writes', () => {
    expect(
      Reflect.getMetadata(permissions_key, CustomsController.prototype.findAll),
    ).toEqual([Permission.CUSTOMS_READ]);
    expect(
      Reflect.getMetadata(
        permissions_key,
        CustomsController.prototype.createDeclaration,
      ),
    ).toEqual([Permission.CUSTOMS_WRITE]);
  });
});
