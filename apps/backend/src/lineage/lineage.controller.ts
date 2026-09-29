import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { LineageService } from './lineage.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Lineage')
@ApiBearerAuth()
@Controller('lineage')
@UseGuards(AuthGuard('jwt'))
export class LineageController {
  constructor(private readonly lineageService: LineageService) {}

  @Get()
  async getLineage(@Query('po_line_id') poLineId?: string) {
    if (!poLineId)
      throw new BadRequestException(
        'po_line_id query parameter is required for lineage tracing (SRS 5.3).',
      );
    return this.lineageService.getPoLineage(poLineId);
  }
}
