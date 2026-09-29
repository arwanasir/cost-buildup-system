import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class CreateClearingInvoiceDto {
  @IsString()
  @ApiProperty()
  provider!: string;

  @IsString()
  @ApiProperty()
  invoiceNumber!: string;

  @IsDateString()
  @ApiProperty()
  date!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  amount!: number;

  @IsString()
  @ApiProperty()
  currency!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty()
  fxRate!: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  attachment?: string;
}
