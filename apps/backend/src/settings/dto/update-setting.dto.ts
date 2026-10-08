import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty()
  valueNumeric?: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  valueText?: string;
}
