import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ApprovePoDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  comment?: string;
}
