import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLcDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  issuingBank?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  advisingBank?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ApiProperty()
  presentationPeriodDays?: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  incoterm?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  partialShipmentAllowed?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  transhipmentAllowed?: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty()
  specialConditions?: string;
}

export class MarkDocumentReceivedDto {
  @IsBoolean()
  @ApiProperty()
  isReceived!: boolean;
}
