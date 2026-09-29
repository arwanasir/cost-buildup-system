import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  itemCode!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  unitOfMeasure!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  defaultHsCode?: string;
}
