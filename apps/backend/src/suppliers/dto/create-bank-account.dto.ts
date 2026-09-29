import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Length,
} from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  bankName!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  swift?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  ibanOrAccount!: string;

  @IsString()
  @Length(3, 3)
  @IsNotEmpty()
  @ApiProperty()
  currency!: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  isDefault?: boolean;
}
