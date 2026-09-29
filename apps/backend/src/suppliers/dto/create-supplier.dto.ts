import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Length,
  IsInt,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  country?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  tin?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  phone?: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty()
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  paymentTerms?: string;

  @IsString()
  @Length(3, 3)
  @IsNotEmpty()
  @ApiProperty()
  defaultCurrency!: string;

  @IsInt()
  @Min(0)
  @ApiProperty()
  leadTimeDays!: number;
}
