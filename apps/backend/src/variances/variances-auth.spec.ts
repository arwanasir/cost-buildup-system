import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import {
  VariancesController,
  ShipmentVariancesController,
} from './variances.controller';
import { VariancesService } from './variances.service';
import { DRIZZLE } from '@/db/db.token';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

describe('VariancesController permissions', () => {
  let app: INestApplication;
  let role: string;
  const permissionsByRole: Record<string, string[]> = {
    auditor: ['variance:read'],
    finance_manager: ['variance:read', 'variance:approve'],
    finance_officer: [],
  };

  beforeAll(async () => {
    const dbMock = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(async () =>
            (permissionsByRole[role] || []).map((permission) => ({
              permission,
            })),
          ),
        })),
      })),
    };
    const serviceMock = {
      findAll: jest.fn().mockResolvedValue([]),
      findByShipment: jest.fn().mockResolvedValue([]),
      approve: jest.fn().mockResolvedValue({ id: 'variance-1' }),
      reject: jest.fn().mockResolvedValue({ id: 'variance-1' }),
      evaluate: jest.fn().mockResolvedValue([]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VariancesController, ShipmentVariancesController],
      providers: [
        PermissionGuard,
        { provide: VariancesService, useValue: serviceMock },
        { provide: DRIZZLE, useValue: dbMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            id: 'test-user',
            role,
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('allows an auditor to view variances', async () => {
    role = 'auditor';
    await request(app.getHttpServer()).get('/variances').expect(200);
  });

  it('denies an auditor variance approval actions', async () => {
    role = 'auditor';
    await request(app.getHttpServer())
      .post('/variances/variance-1/approve')
      .send({ comment: 'review' })
      .expect(403);
  });

  it('denies a finance officer variance reads without variance:read', async () => {
    role = 'finance_officer';
    await request(app.getHttpServer()).get('/variances').expect(403);
  });
});
