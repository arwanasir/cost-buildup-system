import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class CreateTariffDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  hsCode!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  description!: string;

  @IsEnum(['ad_valorem', 'specific'])
  @IsOptional()
  @ApiProperty()
  dutyStructure?: 'ad_valorem' | 'specific';

  @IsNumber()
  @IsOptional()
  @ApiProperty()
  dutyRate?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty()
  specificDutyPerUnit?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty()
  exciseRate?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty()
  withholdingRate?: number;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty()
  effectiveFrom!: string;
}
