import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../auth/guards/permissions.guards';
import { RequiredPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { InventoryPostingService } from './inventory-posting.service';
import { FinancePostingService } from './finance-posting.service';

@ApiTags('ErpSync')
@ApiBearerAuth()
@Controller('erp-sync')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class ErpSyncController {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly financePostingService: FinancePostingService,
  ) {}

  @Get()
  @RequiredPermission(Permission.ADMIN_ALL)
  async getSyncLogs(
    @Query('entity_type') entityType?: string,
    @Query('status') status?: string,
  ) {
    const conditions = [];
    if (entityType) {
      conditions.push(eq(schema.erpSyncLog.entityType, entityType as any));
    }
    if (status) {
      conditions.push(eq(schema.erpSyncLog.status, status as any));
    }

    const query = this.db.select().from(schema.erpSyncLog);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // We don't have a reliable sort column besides sentAt. If it's missing, no sort.
    return await query.limit(50);
  }

  @Post(':id/retry')
  @RequiredPermission(Permission.ADMIN_ALL)
  async retrySync(@Param('id') id: string) {
    const [log] = await this.db
      .select()
      .from(schema.erpSyncLog)
      .where(eq(schema.erpSyncLog.id, id));
    if (!log) throw new Error('Log not found');

    await this.db
      .update(schema.erpSyncLog)
      .set({ attempts: 0, status: 'pending' })
      .where(eq(schema.erpSyncLog.id, id));

    if (log.entityType === 'inventory_posting') {
      return await this.inventoryPostingService.post(log.entityId, log.id);
    } else if (log.entityType === 'journal_entry') {
      const payload: any = log.payload;
      return await this.financePostingService.postGrnJournal(
        payload.source_id,
        log.id,
      );
    }
    return { success: false, message: 'Unknown entity type' };
  }
}
