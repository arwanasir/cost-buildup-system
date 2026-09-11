import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DRIZZLE } from '../db/db.module';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
const mockQueryBuilder = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn<() => Promise<any>>().mockResolvedValue([]),
    values: jest.fn<() => Promise<any>>().mockResolvedValue([]),
};

const mockDb = {
    query: {
        users: { findFirst: jest.fn<() => Promise<any>>() },
        refreshTokens: { findFirst: jest.fn<() => Promise<any>>() },
    },
    update: jest.fn(() => mockQueryBuilder),
    insert: jest.fn(() => mockQueryBuilder),
};

const mockJwtService = {
    sign: jest.fn(() => 'mock-access-token'),
};

const mockConfigService = {
    get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-secret';
        return null;
    }),
};

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: DRIZZLE, useValue: mockDb },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jest.clearAllMocks();
    });

    const mockActiveUser = {
        id: 'user-uuid',
        email: 'test@company.com',
        passwordHash: 'hashed-password',
        role: 'FINANCE_OFFICER',
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
    };

    describe('login()', () => {
        it('should return token pair on successful login', async () => {
            mockDb.query.users.findFirst.mockResolvedValueOnce(mockActiveUser);
            jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

            const result = await service.login({ email: 'test@company.com', password: 'password123' });

            expect(result).toHaveProperty('accessToken', 'mock-access-token');
            expect(result).toHaveProperty('refreshToken');
            expect((result as any).user.email).toBe('test@company.com');
            expect(mockDb.insert).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException on wrong password', async () => {
            mockDb.query.users.findFirst.mockResolvedValueOnce(mockActiveUser);
            jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

            await expect(
                service.login({ email: 'test@company.com', password: 'wrong-password' })
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should lock account and return 423 after 5 failed attempts', async () => {

            const userNearLockout = {
                ...mockActiveUser,
                failedLoginCount: 4,
                updatedAt: new Date()
            };

            mockDb.query.users.findFirst.mockResolvedValueOnce(userNearLockout);
            jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

            try {
                await service.login({ email: 'test@company.com', password: 'wrong-password' });
            } catch (error) {
                expect(error).toBeInstanceOf(HttpException);
                expect((error as HttpException).getStatus()).toBe(HttpStatus.LOCKED);
                expect(mockQueryBuilder.set).toHaveBeenCalledWith(
                    expect.objectContaining({ failedLoginCount: 5 })
                );
            }
        });
    });

    describe('refreshTokens()', () => {
        const rawToken = 'raw-refresh-token';
        const mockTokenRecord = {
            id: 'token-uuid',
            userId: 'user-uuid',
            tokenHash: 'hashed-token-value',
            expiresAt: new Date(Date.now() + 100000),
            revokedAt: null,
        };

        beforeEach(() => {
            jest.spyOn(crypto, 'createHash').mockReturnValue({
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('hashed-token-value'),
            } as any);
        });

        it('should rotate tokens and revoke the old one', async () => {
            mockDb.query.refreshTokens.findFirst.mockResolvedValueOnce(mockTokenRecord);
            mockDb.query.users.findFirst.mockResolvedValueOnce(mockActiveUser);

            const result = await service.refreshTokens({ refreshToken: rawToken });

            expect(mockQueryBuilder.set).toHaveBeenCalledWith(
                expect.objectContaining({ revokedAt: expect.any(Date) })
            );
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });

        it('should reject a revoked token and trigger reuse detection', async () => {
            const compromisedToken = { ...mockTokenRecord, revokedAt: new Date() };
            mockDb.query.refreshTokens.findFirst.mockResolvedValueOnce(compromisedToken);

            await expect(service.refreshTokens({ refreshToken: rawToken })).rejects.toThrow(
                'Security violation detected: Compromised refresh token used. All sessions ended.'
            );

            expect(mockQueryBuilder.where).toHaveBeenCalled();
        });
    });
});