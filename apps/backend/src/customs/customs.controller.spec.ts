import { Test, TestingModule } from '@nestjs/testing';
import { CustomsController } from './customs.controller';
import { CustomsService } from './customs.service';
import { DutyPaymentsService } from './duty-payments.service';

describe('CustomsController', () => {
  let controller: CustomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomsController],
      providers: [
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
