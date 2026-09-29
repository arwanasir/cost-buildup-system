import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsAfterDate,
  IsBeforeDate,
} from '../../core/validators/date.validators';

export enum LcType {
  SIGHT = 'sight',
  USANCE = 'usance',
  DEFERRED_PAYMENT = 'deferred_payment',
  REVOLVING = 'revolving',
  STANDBY = 'standby',
}

export enum LcDocumentType {
  BL = 'bl',
  CI = 'ci',
  PACKING_LIST = 'packing_list',
  COO = 'coo',
  INSPECTION_CERT = 'inspection_cert',
  PHYTOSANITARY = 'phytosanitary',
  INSURANCE_CERT = 'insurance_cert',
  OTHER = 'other',
}

export class RequiredDocumentDto {
  @IsEnum(LcDocumentType)
  @ApiProperty()
  documentType!: LcDocumentType;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty()
  notes?: string;
}

export class CreateLcDto {
  @IsString()
  @ApiProperty()
  lcNumber!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @ApiProperty()
  poIds!: string[];

  @IsString()
  @ApiProperty()
  issuingBank!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  advisingBank?: string;

  @IsEnum(LcType)
  @ApiProperty()
  lcType!: LcType;

  @IsPositive()
  @ApiProperty()
  amountForeign!: number;

  @IsString()
  @ApiProperty()
  currency!: string;

  @IsPositive()
  @ApiProperty()
  fxRate!: number;

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  openingDate?: string;

  @IsDateString()
  @IsAfterDate('openingDate')
  @ApiProperty()
  expiryDate!: string;

  @IsDateString()
  @IsOptional()
  @IsBeforeDate('expiryDate')
  @ApiProperty()
  lastShipmentDate?: string;

  @IsNumber()
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredDocumentDto)
  @ApiProperty()
  requiredDocuments!: RequiredDocumentDto[];
}
