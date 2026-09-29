import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class UpdateCostEntryDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  costSubcategory?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  providerName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  invoiceNumber?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  invoiceDate?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ApiProperty()
  amountForeign?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ApiProperty()
  amountEtb?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ApiProperty()
  fxRate?: number;
}
