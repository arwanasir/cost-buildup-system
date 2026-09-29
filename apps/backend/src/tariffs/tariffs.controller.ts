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
} from '@nestjs/common';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';

@ApiTags('Tariffs')
@ApiBearerAuth()
@Controller('tariffs')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Post()
  @RequiredPermission(Permission.TARIFFS_WRITE)
  create(@Body() createTariffDto: CreateTariffDto) {
    return this.tariffsService.create(createTariffDto);
  }

  @Get()
  @RequiredPermission(Permission.TARIFFS_READ)
  findAll() {
    return this.tariffsService.findAll();
  }

  @Get(':hsCode')
  @RequiredPermission(Permission.TARIFFS_READ)
  findOne(@Param('hsCode') hsCode: string) {
    return this.tariffsService.findOne(hsCode);
  }

  @Patch(':hsCode')
  @RequiredPermission(Permission.TARIFFS_WRITE)
  update(
    @Param('hsCode') hsCode: string,
    @Body() updateTariffDto: UpdateTariffDto,
  ) {
    return this.tariffsService.update(hsCode, updateTariffDto);
  }

  @Delete(':hsCode')
  @RequiredPermission(Permission.TARIFFS_WRITE)
  remove(@Param('hsCode') hsCode: string) {
    return this.tariffsService.remove(hsCode);
  }
}
