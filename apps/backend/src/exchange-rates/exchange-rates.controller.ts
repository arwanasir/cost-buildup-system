import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dto/exchange-rate.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';

@ApiTags('ExchangeRates')
@ApiBearerAuth()
@Controller('nbe-rates')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Post()
  @RequiredPermission(Permission.RATES_WRITE)
  create(@Body() createDto: CreateExchangeRateDto, @Req() req: any) {
    // Note: Passport JWT strategy generally attaches user payload directly to req.user
    // Usually contains req.user.userId or req.user.sub. We'll use sub per our token payload.
    const userId = req.user.sub || req.user.userId;
    return this.exchangeRatesService.create(createDto, userId);
  }

  @Get('latest')
  @RequiredPermission(Permission.RATES_READ)
  getLatestRate(@Query('currency') currency: string) {
    if (!currency) {
      throw new BadRequestException('Currency query parameter is required');
    }
    return this.exchangeRatesService.getLatestRate(currency);
  }
}
