import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// Matches the allocation_method_enum in the database
export enum AllocationMethod {
  BY_VALUE = 'by_value',
  BY_WEIGHT = 'by_weight',
  BY_VOLUME = 'by_volume',
  BY_QUANTITY = 'by_quantity',
  EQUAL_SPLIT = 'equal_split',
}

export class CreateCostCategoryDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name!: string;

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
