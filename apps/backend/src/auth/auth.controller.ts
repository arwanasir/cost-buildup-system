import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  HttpStatus,
  UseGuards,
  Ip,
  Body,
  Req,
  Post,
  HttpCode,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractClientIp(req: Request, ip: string): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0].trim();
    }
    return ip;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const clientIp = (req.headers['x-forwarded-for'] as string) || ip;
    return this.authService.login(loginDto, clientIp);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(
    @Body() refreshDto: RefreshDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const clientIp = this.extractClientIp(req, ip);
    return this.authService.refreshTokens(refreshDto, clientIp);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshDto: RefreshDto) {
    return this.authService.logout(refreshDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: Request & { user: { userId: string } }) {
    const userId = req.user.userId;
    return this.authService.getProfile(userId);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request & { user: { userId: string } },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() ResetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(ResetPasswordDto);
  }
}
