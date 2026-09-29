import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsIn,
} from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsDateString()
  @ApiProperty()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty()
  date_to?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty()
  supplier_id?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty()
  item_id?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  category?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  status?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty()
  shipment_id?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  hs_code?: string;

  @IsOptional()
  @IsIn(['month', 'quarter'])
  @ApiProperty()
  period?: 'month' | 'quarter';
}
