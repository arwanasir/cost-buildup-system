import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CostCategoriesService } from './cost-categories.service';
import { CreateCostCategoryDto } from './dto/create-cost-category.dto';
import { UpdateCostCategoryDto } from './dto/update-cost-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';
import { Audited } from '@/audit/audited.decorator';

@ApiTags('CostCategories')
@ApiBearerAuth()
@Controller('cost-categories')
@Audited('costCategories')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class CostCategoriesController {
  constructor(private readonly costCategoriesService: CostCategoriesService) {}

  @Post()
  @RequiredPermission(Permission.ADMIN_ALL)
  create(@Body() createCostCategoryDto: CreateCostCategoryDto) {
    return this.costCategoriesService.create(createCostCategoryDto);
  }

  @Get()
  @RequiredPermission(Permission.COST_READ)
  findAll() {
    return this.costCategoriesService.findAll();
  }

  @Get(':id')
  @RequiredPermission(Permission.COST_READ)
  findOne(@Param('id') id: string) {
    return this.costCategoriesService.findOne(id);
  }

  @Patch(':id')
  @RequiredPermission(Permission.ADMIN_ALL)
  update(
    @Param('id') id: string,
    @Body() updateCostCategoryDto: UpdateCostCategoryDto,
  ) {
    return this.costCategoriesService.update(id, updateCostCategoryDto);
  }

  @Delete(':id')
  @RequiredPermission(Permission.ADMIN_ALL)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.costCategoriesService.remove(id);
  }
}
