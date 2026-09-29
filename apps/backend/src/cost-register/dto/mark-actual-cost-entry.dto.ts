import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';

export class MarkActualCostEntryDto {
  @IsString()
  @ApiProperty()
  providerName!: string;

  @IsString()
  @ApiProperty()
  invoiceNumber!: string;

  @IsDateString()
  @ApiProperty()
  invoiceDate!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  amountForeign!: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ApiProperty()
  amountEtb?: number;
}
