import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AmendLcDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty()
  amountDelta?: number;

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  newExpiryDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  newLastShipmentDate?: string;

  @IsString()
  @ApiProperty()
  description!: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ApiProperty()
  amendmentFeeEtb?: number;
}
