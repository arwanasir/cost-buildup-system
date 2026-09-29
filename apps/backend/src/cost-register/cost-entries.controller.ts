import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  UseGuards,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CostEntriesService } from './cost-entries.service';
import { AllocationService } from '@/allocation/allocation.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { ImmutabilityGuard } from '@/common/guards/immutability.guard';
import { UpdateCostEntryDto } from './dto/update-cost-entry.dto';
import { MarkActualCostEntryDto } from './dto/mark-actual-cost-entry.dto';
import { ReverseCostEntryDto } from './dto/reverse-cost-entry.dto';
import { StorageService } from '@/storage/storage.service';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

@Audited('importCostEntries')
@ApiTags('CostEntries')
@ApiBearerAuth()
@Controller('cost-entries')
@UseGuards(AuthGuard('jwt'), PermissionGuard, ImmutabilityGuard)
export class CostEntriesController {
  constructor(
    private readonly costEntriesService: CostEntriesService,
    private readonly storageService: StorageService,
    private readonly allocationService: AllocationService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  @Patch(':id')
  async updateEntry(@Param('id') id: string, @Body() dto: UpdateCostEntryDto) {
    return this.costEntriesService.update(id, dto);
  }

  @Post(':id/mark-actual')
  async markActual(
    @Param('id') id: string,
    @Body() dto: MarkActualCostEntryDto,
    @Req() req: any,
  ) {
    return this.costEntriesService.markActual(id, dto, req.user.id);
  }

  @Post(':id/reverse')
  async reverseEntry(
    @Param('id') id: string,
    @Body() dto: ReverseCostEntryDto,
    @Req() req: any,
  ) {
    return this.costEntriesService.reverse(id, dto, req.user.id);
  }

  @Delete(':id')
  async deleteEntry(@Param('id') id: string) {
    return this.costEntriesService.delete(id);
  }

  @Get(':id/attachment')
  async getAttachment(@Param('id') id: string) {
    const [entry] = await this.db
      .select()
      .from(schema.importCostEntries)
      .where(eq(schema.importCostEntries.id, id));
    if (!entry) throw new NotFoundException('Cost entry not found');
    if (!entry.attachmentKey)
      throw new NotFoundException('No attachment found for this cost entry');
    const url = await this.storageService.getSignedUrl(
      entry.attachmentKey,
      3600,
    );
    return { url };
  }

  @Get(':id/allocations')
  async getAllocations(@Param('id') id: string) {
    return this.allocationService.getAllocationsByEntry(id);
  }
}
