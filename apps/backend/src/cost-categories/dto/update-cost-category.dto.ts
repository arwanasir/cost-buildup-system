import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { AllocationMethod } from './create-cost-category.dto';

export class UpdateCostCategoryDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  code?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  name?: string;

  @IsEnum(AllocationMethod)
  @IsOptional()
  @ApiProperty()
  defaultAllocationMethod?: AllocationMethod;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  isItemSpecific?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  @ApiProperty()
  sortOrder?: number;
}
