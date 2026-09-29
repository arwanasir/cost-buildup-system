import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';
import { Request } from 'express';

@Audited('policySettings')
@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequiredPermission(Permission.SETTINGS_READ)
  findAll() {
    return this.settingsService.findAll();
  }

  @Patch(':key')
  @RequiredPermission(Permission.SETTINGS_WRITE)
  update(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.settingsService.update(key, updateSettingDto, req.user.userId);
  }
}
