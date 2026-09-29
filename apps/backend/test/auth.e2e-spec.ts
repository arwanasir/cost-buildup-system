import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;

  // Pre-defined users from our seed data
  const users = {
    warehouse_manager: {
      email: 'inventory.mgr@company.com',
      password: 'Password123!',
    },
    finance_officer: {
      email: 'finance.officer@company.com',
      password: 'Password123!',
    },
    procurement_manager: {
      email: 'importer@company.com',
      password: 'Password123!',
    }, // Procurement Officer in seed but has some access
    admin: { email: 'admin@company.com', password: 'Password123!' },
  };

  let warehouseManagerToken = '';
  let financeOfficerToken = '';
  let financeOfficerRefreshToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('TC-RBAC01: Login and Token Management', () => {
    it('should successfully login and return JWT tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: users.finance_officer.email,
          password: users.finance_officer.password,
        })
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      financeOfficerToken = res.body.accessToken;
      financeOfficerRefreshToken = res.body.refreshToken;
    });

    it('should refresh tokens using a valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: financeOfficerRefreshToken,
        })
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      // Update tokens for subsequent tests
      financeOfficerToken = res.body.accessToken;
    });
  });

  describe('TC-RBAC02: Lockout after 5 failures', () => {
    it('should lockout user after 5 consecutive failed login attempts', async () => {
      // First 4 attempts should return 401 Unauthorized
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: users.admin.email,
            password: 'WrongPassword123!',
          })
          .expect(HttpStatus.UNAUTHORIZED);
      }

      // The 5th attempt should lock the account and return 423 Locked
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        email: users.admin.email,
        password: 'WrongPassword123!',
      });

      // The service throws HttpException with HttpStatus.LOCKED (423)
      expect(res.status).toBe(HttpStatus.LOCKED);
      expect(res.body.message).toContain('Account locked');
    });
  });

  describe('TC-RBAC03: RBAC checks and self-approval blocks', () => {
    beforeAll(async () => {
      // Login as warehouse manager to get token
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: users.warehouse_manager.email,
          password: users.warehouse_manager.password,
        })
        .expect(HttpStatus.OK);

      warehouseManagerToken = res.body.accessToken;
    });

    it('should block warehouse_manager from accessing LC routes', async () => {
      // warehouse_manager lacks LC_READ and LC_WRITE
      await request(app.getHttpServer())
        .get('/letters-of-credit')
        .set('Authorization', `Bearer \${warehouseManagerToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should block warehouse_manager from accessing Cost Entry routes', async () => {
      // warehouse_manager lacks COST_WRITE
      await request(app.getHttpServer())
        .post('/cost-entries/some-id/mark-actual')
        .set('Authorization', `Bearer \${warehouseManagerToken}`)
        .send({
          actualAmountEtb: 100,
          notes: 'Test',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should block finance_officer from self-approving or approving POs without permission', async () => {
      // finance_officer lacks PO_APPROVE_TIER1 and should be blocked from PO approval routes
      await request(app.getHttpServer())
        .post('/purchase-orders/some-id/approve')
        .set('Authorization', `Bearer \${financeOfficerToken}`)
        .send({
          comment: 'Approved by finance',
        })
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
