import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  @ApiProperty()
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  fullName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  role?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  department?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  @Matches(/^$|^-?\d{1,20}$/)
  @ApiProperty({ required: false, description: 'Telegram numeric chat ID' })
  telegramChatId?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  temporaryPassword?: string;
}
