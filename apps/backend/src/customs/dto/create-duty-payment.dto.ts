import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class CreateDutyPaymentDto {
  @IsDateString()
  @ApiProperty()
  paymentDate!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  bankReference?: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  amountPaidEtb!: number;

  @IsString()
  @ApiProperty()
  receiptNumber!: string;
}
