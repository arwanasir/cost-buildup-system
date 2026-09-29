import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsNumber,
  IsPositive,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShipmentItemDto {
  @IsUUID()
  @ApiProperty()
  poLineId!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  shippedQuantity!: number;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  ciUnitPrice!: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @ApiProperty()
  weightKg?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @ApiProperty()
  volumeCbm?: number;
}

export class CreateShipmentDto {
  @IsUUID()
  @ApiProperty()
  poId!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  vesselName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  blNumber?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  blDate?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  portOfLoading?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  portOfDestination?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  incoterm?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  carrier?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty()
  containerNumbers?: string[];

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  eta?: string;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @ApiProperty()
  totalWeightKg?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @ApiProperty()
  totalVolumeCbm?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  allowOverShipment?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  @ArrayMinSize(1)
  @ApiProperty()
  items!: ShipmentItemDto[];
}
