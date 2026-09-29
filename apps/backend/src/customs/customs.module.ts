import { Module } from '@nestjs/common';
import { CustomsService } from './customs.service';
import { AllocationService } from './allocation.service';
import { DutyCalculatorService } from './duty-calculator.service';
import { DutyPaymentsService } from './duty-payments.service';
import { CustomsController } from './customs.controller';

@Module({
  providers: [
    CustomsService,
    DutyCalculatorService,
    DutyPaymentsService,
    AllocationService,
  ],
  controllers: [CustomsController],
})
export class CustomsModule {}
