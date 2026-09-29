import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  IsDateString,
} from 'class-validator';

export enum LcChargeType {
  OPENING_FEE = 'opening_fee',
  AMENDMENT_FEE = 'amendment_fee',
  ADVISING_CONFIRMATION_FEE = 'advising_confirmation_fee',
  ACCEPTANCE_COMMISSION = 'acceptance_commission',
  SWIFT = 'swift',
}

export class AddBankChargeDto {
  @IsEnum(LcChargeType)
  @ApiProperty()
  chargeType!: LcChargeType;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  amountEtb!: number;

  @IsDateString()
  @ApiProperty()
  chargeDate!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  bankReference?: string;
}
