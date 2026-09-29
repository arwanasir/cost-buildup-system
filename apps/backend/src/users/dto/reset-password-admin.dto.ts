import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordAdminDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty()
  newPassword!: string;
}
