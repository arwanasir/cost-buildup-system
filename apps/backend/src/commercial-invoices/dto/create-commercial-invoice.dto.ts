import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsNumber,
  IsPositive,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CommercialInvoiceItemDto {
  @IsUUID()
  @ApiProperty()
  shipmentItemId!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  ciUnitPrice!: number;
}

export class CreateCommercialInvoiceDto {
  @IsString()
  @ApiProperty()
  invoiceNumber!: string;

  @IsDateString()
  @ApiProperty()
  invoiceDate!: string;

  @IsString()
  @ApiProperty()
  currency!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  fxRate!: number;

  @ValidateNested({ each: true })
  @Type(() => CommercialInvoiceItemDto)
  @ArrayMinSize(1)
  @ApiProperty()
  items!: CommercialInvoiceItemDto[];
}
