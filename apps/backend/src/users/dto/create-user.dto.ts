import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

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
  @IsOptional()
  @Matches(/^$|^-?\d{1,20}$/)
  @ApiProperty({ required: false, description: 'Telegram numeric chat ID' })
  telegramChatId?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  temporaryPassword?: string;
}
