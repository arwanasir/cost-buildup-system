import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { InventoryPostingService } from '../erp-sync/inventory-posting.service';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(ApiKeyGuard)
export class IntegrationsController {
  constructor(
    private readonly inventoryPostingService: InventoryPostingService,
  ) {}

  @Post('inventory/landed-cost')
  async pullLandedCost(@Body() body: { grn_id: string }) {
    if (!body.grn_id) {
      throw new Error('grn_id is required');
    }
    const result = await this.inventoryPostingService.getPayloadForGrn(
      body.grn_id,
    );
    return { items: result.items };
  }
}
