import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Must be a valid email Address' })
  @IsNotEmpty()
  @ApiProperty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @ApiProperty()
  password!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  @ApiProperty()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  oldPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be 8 character long.' })
  @ApiProperty()
  newPassword!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be 8 character long.' })
  @ApiProperty()
  newPassword!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  @ApiProperty()
  email!: string;
}
