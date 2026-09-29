import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  Length,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class CreateCostEntryDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty()
  shipmentId?: string;

  @IsUUID()
  @ApiProperty()
  costCategoryId!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  costSubcategory?: string;

  @IsString()
  @ApiProperty()
  providerName!: string;

  @IsString()
  @ApiProperty()
  invoiceNumber!: string;

  @IsDateString()
  @ApiProperty()
  invoiceDate!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  amountForeign!: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ApiProperty()
  amountEtb?: number;

  @IsString()
  @Length(3, 3)
  @ApiProperty()
  currency!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  fxRate!: number;

  @IsString()
  @IsOptional()
  @IsIn([
    'by_value',
    'by_weight',
    'by_volume',
    'by_quantity',
    'item_specific',
    'manual',
  ])
  @ApiProperty()
  allocationMethod?: string;

  @IsBoolean()
  @ApiProperty()
  isEstimated!: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty()
  attachment?: string;
}
