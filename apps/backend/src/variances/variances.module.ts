import { Module } from '@nestjs/common';
import { VariancesService } from './variances.service';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  VariancesController,
  ShipmentVariancesController,
} from './variances.controller';
import { DatabaseModule } from '@/db/db.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VariancesController, ShipmentVariancesController],
  providers: [VariancesService],
  exports: [VariancesService],
})
export class VariancesModule {}
