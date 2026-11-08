import { LcStatusService } from './lc-status.service';
import { Module } from '@nestjs/common';
import { LettersOfCreditController } from './letters-of-credit.controller';
import { LettersOfCreditService } from './letters-of-credit.service';
import { LcAlertScheduler } from './lc-alert.scheduler';
import { LcChargeSyncListener } from './lc-charge-sync.listener';
import { LcAccountingListener } from './lc-accounting.listener';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LettersOfCreditController],
  providers: [
    LettersOfCreditService,
    LcAlertScheduler,
    LcStatusService,
    LcChargeSyncListener,
    LcAccountingListener,
  ],
})
export class LettersOfCreditModule {}
