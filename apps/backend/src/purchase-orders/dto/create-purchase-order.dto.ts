import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  IsDateString,
  Length,
  ValidateNested,
  ArrayMinSize,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum Incoterm {
  FOB = 'FOB',
  CIF = 'CIF',
  EXW = 'EXW',
  CFR = 'CFR',
  CPT = 'CPT',
  DAP = 'DAP',
}

export class CreatePoLineDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  itemId!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  description?: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  unitOfMeasure!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  unitPrice!: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  hsCode?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiProperty()
  estimatedDutyRate?: number;
}

export class CreatePurchaseOrderDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty()
  poDate!: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  supplierId!: string;

  @IsEnum(Incoterm)
  @IsNotEmpty()
  @ApiProperty()
  incoterm!: Incoterm;

  @IsString()
  @IsOptional()
  @ApiProperty()
  countryOfOrigin?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  estimatedShipmentDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  estimatedArrivalDate?: string;

  @IsString()
  @Length(3, 3)
  @IsNotEmpty()
  @ApiProperty()
  currency!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  fxRate!: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  portOfLoading?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  portOfDestination?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiProperty()
  estimatedFreightEtb?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiProperty()
  estimatedInsuranceEtb?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiProperty()
  estimatedOtherChargesEtb?: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => CreatePoLineDto)
  @ArrayMinSize(1)
  @ApiProperty()
  lines!: CreatePoLineDto[];
}
