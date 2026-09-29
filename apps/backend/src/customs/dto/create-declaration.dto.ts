import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNumber,
  IsPositive,
  IsBoolean,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeclarationItemOverrideDto {
  @IsUUID()
  @ApiProperty()
  shipmentItemId!: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  isRateOverridden?: boolean;

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

export class CreateDeclarationDto {
  @IsUUID()
  @ApiProperty()
  shipmentId!: string;

  @IsString()
  @ApiProperty()
  declarationNumber!: string;

  @IsDateString()
  @ApiProperty()
  declarationDate!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  clearingAgent?: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  fxRate!: number;

  @ValidateNested({ each: true })
  @Type(() => DeclarationItemOverrideDto)
  @IsOptional()
  @ApiProperty()
  itemOverrides?: DeclarationItemOverrideDto[];
}
