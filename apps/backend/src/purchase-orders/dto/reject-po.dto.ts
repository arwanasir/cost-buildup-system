import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectPoDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  comment!: string;
}
