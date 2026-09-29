import { Test, TestingModule } from '@nestjs/testing';
import { LettersOfCreditController } from './letters-of-credit.controller';
import { LettersOfCreditService } from './letters-of-credit.service';
import { LcStatusService } from './lc-status.service';
import { LcAlertScheduler } from './lc-alert.scheduler';

describe('LettersOfCreditController', () => {
  let controller: LettersOfCreditController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LettersOfCreditController],
      providers: [
        { provide: LettersOfCreditService, useValue: {} },
        { provide: LcStatusService, useValue: {} },
        { provide: LcAlertScheduler, useValue: {} },
      ],
    }).compile();

    controller = module.get<LettersOfCreditController>(
      LettersOfCreditController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
