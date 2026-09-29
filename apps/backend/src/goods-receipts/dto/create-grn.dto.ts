import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGrnItemDto {
  @IsUUID()
  @ApiProperty()
  shipmentItemId!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  receivedQuantity!: number;

  @IsEnum(['accepted', 'rejected', 'partial'])
  @ApiProperty()
  inspectionResult!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  acceptedQuantity!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  rejectedQuantity!: number;

  @IsOptional()
  @IsString()
  @ApiProperty()
  rejectionReason?: string;
}

export class CreateGrnDto {
  @IsUUID()
  @ApiProperty()
  shipmentId!: string;

  @IsDateString()
  @ApiProperty()
  receiptDate!: string;

  @IsString()
  @ApiProperty()
  warehouseLocation!: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty()
  inspectedBy?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGrnItemDto)
  @ApiProperty()
  items!: CreateGrnItemDto[];
}
