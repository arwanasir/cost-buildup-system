import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { ErpSyncModule } from '../erp-sync/erp-sync.module';

@Module({
  imports: [ErpSyncModule],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
