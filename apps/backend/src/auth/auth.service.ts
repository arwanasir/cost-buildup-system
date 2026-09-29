import { DRIZZLE, DrizzleDB } from '@/db';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import * as schema from '../db/schema';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '@/audit/audit.service';
import { RolePermission, Role } from './permissions';

// TODO

const max_failed_attempt = 5;
const lockout_duration_ms = 15 * 60 * 1000;
const attempt_ms = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string, clientIp?: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('user account is deactivated');
    }
    const now = new Date();

    if (user.lockedUntil && new Date(user.lockedUntil) > now) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lockedUntil).getTime() - now.getTime()) / 60000,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.LOCKED,
          error: 'Locked',
          message: `Account is temporarily locked due to repeated failed login attempts. Try again in ${remainingMinutes} minute(s).`,
        },
        HttpStatus.LOCKED,
      );
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.handleFailedAttempt(user, now, clientIp);
      throw new UnauthorizedException('invalid Credential');
    }

    if (user.failedLoginCount > 0 || user.lockedUntil !== null) {
      await this.db
        .update(schema.users)
        .set({
          failedLoginCount: 0,
          lockedUntil: null,
          updatedAt: now.toISOString(),
        })
        .where(eq(schema.users.id, user.id));
    }

    const { passwordHash, ...userWithoutpassword } = user;
    return userWithoutpassword;
  }

  private async handleFailedAttempt(
    user: typeof schema.users.$inferSelect,
    now: Date,
    clientIp?: string,
  ) {
    let newCount = (user.failedLoginCount || 0) + 1;
    let lockUntilDate: Date | null = null;

    if (
      user.updatedAt &&
      now.getTime() - new Date(user.updatedAt).getTime() > attempt_ms
    ) {
      newCount = 1;
    }
    if (newCount >= max_failed_attempt) {
      lockUntilDate = new Date(now.getTime() + lockout_duration_ms);
    }
    await this.db
      .update(schema.users)
      .set({
        failedLoginCount: newCount,
        lockedUntil: lockUntilDate?.toISOString(),
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.users.id, user.id));

    if (lockUntilDate) {
      throw new HttpException(
        {
          statusCode: HttpStatus.LOCKED,
          error: 'Locked',
          message: `Account locked due to 5 consecutive failed login attempts. Please try again after 15 minutes.`,
        },
        HttpStatus.LOCKED,
      );
    }
  }
  async login(loginDto: LoginDto, clientIp?: string) {
    let loggedInUser: any = null;
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      clientIp,
    );
    loggedInUser = user;
    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      clientIp,
    );
    return {
      ...tokens, //
      user,
    };
    await this.auditService.record({
      entityType: 'users',
      entityId: user.id,
      action: 'login',
      actorId: user.id,
      ip: clientIp,
      after: { success: true },
    });
    return { ...tokens, user };
  }

  async refreshTokens(refreshDto: RefreshDto, clientIp?: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshDto.refreshToken)
      .digest('hex');
    const existingToken = await this.db.query.refreshTokens.findFirst({
      where: eq(schema.refreshTokens.tokenHash, tokenHash),
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (existingToken.revokedAt) {
      await this.db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(schema.refreshTokens.userId, existingToken.userId));
      throw new UnauthorizedException(
        'Security violation detected: Compromised refresh token used. All sessions ended.',
      );
    }
    if (new Date(existingToken.expiresAt) <= new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }
    const now = new Date();
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: now.toISOString() })
      .where(eq(schema.refreshTokens.id, existingToken.id));
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, existingToken.userId),
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer active');
    }
    return this.generateTokenPair(user.id, user.email, user.role, clientIp);
  }

  async logout(refreshDto: RefreshDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshDto.refreshToken)
      .digest('hex');

    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, tokenHash),
          isNull(schema.refreshTokens.revokedAt),
        ),
      );

    return { message: 'Logged out successfully' };
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    role: string,
    clientIp?: string,
  ) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('JWT_ACCESS_SECRET') ||
        'defaultAccessSecretKey',
      expiresIn: '15m',
    });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.db.insert(schema.refreshTokens).values({
      userId,
      tokenHash,
      createdIp: clientIp || null,
      expiresAt: expiresAt.toISOString(),
    });
    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }
  async getProfile(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const permissions = RolePermission[user.role as Role] || [];

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      preferred_language: user.preferredLanguage || 'en',
      permissions: permissions,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid old password');
    }

    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );
    await this.db
      .update(schema.users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));

    // Revoke all refresh tokens for this user so they have to log in again on other devices
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(
        and(
          eq(schema.refreshTokens.userId, userId),
          isNull(schema.refreshTokens.revokedAt),
        ),
      );

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, forgotPasswordDto.email),
    });
    if (!user || !user.isActive) {
      return { message: 'If that email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.db
      .update(schema.users)
      .set({ resetTokenHash: resetTokenHash, resetTokenExpires: expiresAt })
      .where(eq(schema.users.id, user.id));
    console.log(`password reset token for ${user.email}:${resetToken}`);
    return {
      message: 'If that email exists, a reset token has een sent.',
      _devToken: resetToken,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(resetPasswordDto.token)
      .digest('hex');
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.resetTokenHash, tokenHash),
    });
    if (
      !user ||
      !user.resetTokenExpires ||
      new Date() > new Date(user.resetTokenExpires)
    ) {
      throw new UnauthorizedException('Invalid or expired rest token');
    }
    const newPasswordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.db
      .update(schema.users)
      .set({
        passwordHash: newPasswordHash,
        resetTokenHash: null,
        resetTokenExpires: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, user.id));

    return { message: 'Password has been successfully reset' };
  }
}
