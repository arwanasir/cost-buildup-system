import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Length,
  IsDateString,
} from 'class-validator';

export class CreateExchangeRateDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @ApiProperty()
  currency!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty()
  rateDate!: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  rate!: number;
}
