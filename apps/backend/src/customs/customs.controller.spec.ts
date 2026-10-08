import { Test, TestingModule } from '@nestjs/testing';
import { CustomsController } from './customs.controller';
import { CustomsService } from './customs.service';
import { DutyPaymentsService } from './duty-payments.service';
import { DRIZZLE } from '../db/db.module';

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
});
