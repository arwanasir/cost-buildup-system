import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateReleaseDto {
  @IsDateString()
  @ApiProperty()
  releaseDate!: string;

  @IsString()
  @ApiProperty()
  releaseReference!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  customsOfficer?: string;
}
