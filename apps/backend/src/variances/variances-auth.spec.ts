import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { VariancesModule } from './variances.module';
import { AuthGuard } from '@nestjs/passport';
import { DRIZZLE } from '@/db';

describe('VariancesController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // We mock the database just in case, though the guard should fail before DB is hit.
    // Actually, the guard passes, but the service throws the 403.
    const dbMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'var-1' }]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [VariancesModule],
    })
      .overrideProvider(DRIZZLE)
      .useValue(dbMock)
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          // Simulating the JWT strategy attaching the user to the request
          req.user = { id: 'fo-1', role: 'finance_officer' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/variances/:id/approve (POST) - should return 403 for finance_officer', () => {
    return request(app.getHttpServer())
      .post('/variances/var-1/approve')
      .send({ comment: 'looks good' })
      .expect(403)
      .expect((res: any) => {
        expect(res.body.message).toEqual(
          'Only Finance Manager or General Manager can approve variances',
        );
      });
  });

  it('/variances/:id/reject (POST) - should return 403 for finance_officer', () => {
    return request(app.getHttpServer())
      .post('/variances/var-1/reject')
      .send({ comment: 'nope' })
      .expect(403)
      .expect((res: any) => {
        expect(res.body.message).toEqual(
          'Only Finance Manager or General Manager can reject variances',
        );
      });
  });
});
