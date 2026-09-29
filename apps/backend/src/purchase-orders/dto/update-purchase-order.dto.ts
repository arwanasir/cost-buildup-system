import { ApiProperty } from '@nestjs/swagger';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import {
  CreatePurchaseOrderDto,
  CreatePoLineDto,
} from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto extends PartialType(
  OmitType(CreatePurchaseOrderDto, ['lines'] as const),
) {}

export class UpdatePoLineDto extends PartialType(CreatePoLineDto) {}
