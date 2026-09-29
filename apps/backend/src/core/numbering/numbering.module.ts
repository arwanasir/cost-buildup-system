import { Module, Global } from '@nestjs/common';
import { NumberingService } from './numbering.service';

@Global()
@Module({
  providers: [NumberingService],
  exports: [NumberingService],
})
export class NumberingModule {}
