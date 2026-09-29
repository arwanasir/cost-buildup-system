import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateSettingDto {
  @IsNumber()
  @ApiProperty()
  valueNumeric!: number;
}
