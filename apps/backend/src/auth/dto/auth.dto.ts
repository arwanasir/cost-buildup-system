import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Must be a valid email Address' })
    @IsNotEmpty()
    email!: string;


    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'password must be at least 8 characters long' })
    password!: string;


}

export class RefreshDto {
    @IsString()
    @IsNotEmpty({ message: 'Refresh token is required' })
    refreshToken!: string;
}