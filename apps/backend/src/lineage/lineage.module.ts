import { Module } from '@nestjs/common';
import { LineageService } from './lineage.service';
import { LineageController } from './lineage.controller';

@Module({
  controllers: [LineageController],
  providers: [LineageService],
})
export class LineageModule {}
