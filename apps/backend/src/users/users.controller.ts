import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';
import { ResetPasswordAdminDto } from './dto/reset-password-admin.dto';

@Audited('users')
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequiredPermission(Permission.ADMIN_ALL)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordAdminDto,
  ) {
    return this.usersService.resetPassword(id, resetPasswordDto.newPassword);
  }
}
