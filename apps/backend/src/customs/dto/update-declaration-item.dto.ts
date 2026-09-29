import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  ValidateIf,
} from 'class-validator';

export class UpdateDeclarationItemDto {
  @IsBoolean()
  @ApiProperty()
  isRateOverridden!: boolean;

  @IsString()
  @ValidateIf((o) => o.isRateOverridden)
  @ApiProperty()
  overrideReason?: string;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @ApiProperty()
  dutyRate?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @ApiProperty()
  exciseRate?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @ApiProperty()
  vatRate?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @ApiProperty()
  withholdingRate?: number;
}
