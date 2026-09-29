import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  role!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  department?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  preferredLanguage?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  temporaryPassword?: string;
}
