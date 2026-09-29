import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';
import { Request } from 'express';

@Audited('items')
@ApiTags('Items')
@ApiBearerAuth()
@Controller('items')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @RequiredPermission(Permission.ITEM_WRITE)
  create(
    @Body() createItemDto: CreateItemDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.itemsService.create(createItemDto, req.user.userId);
  }

  @Get()
  @RequiredPermission(Permission.ITEM_READ)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const isActiveBool =
      isActive !== undefined ? isActive === 'true' : undefined;

    return this.itemsService.findAll(pageNum, limitNum, search, isActiveBool);
  }

  @Get('search')
  @RequiredPermission(Permission.ITEM_READ)
  searchTypeahead(@Query('q') q?: string) {
    return this.itemsService.searchTypeahead(q);
  }

  @Get(':id')
  @RequiredPermission(Permission.ITEM_READ)
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @RequiredPermission(Permission.ITEM_WRITE)
  update(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.itemsService.update(id, updateItemDto, req.user.userId);
  }

  @Delete(':id/deactivate')
  @RequiredPermission(Permission.ITEM_WRITE)
  deactivate(@Param('id') id: string) {
    return this.itemsService.deactivate(id);
  }
}
