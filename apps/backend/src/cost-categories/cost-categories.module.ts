import { Module } from '@nestjs/common';
import { CostCategoriesController } from './cost-categories.controller';
import { CostCategoriesService } from './cost-categories.service';

@Module({
  controllers: [CostCategoriesController],
  providers: [CostCategoriesService],
})
export class CostCategoriesModule {}
