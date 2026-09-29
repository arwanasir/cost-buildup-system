import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ReverseCostEntryDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  reason!: string;
}
