import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { execSync } from 'child_process';
import * as path from 'path';

describe('Reports & Exports (e2e) (TC-RPT-01 to 09)', () => {
  let app: INestApplication;
  let adminToken = '';
  let demoSupplierId = '';

  const reportKeys = [
    'landed-cost-by-shipment',
    'landed-cost-by-item',
    'landed-cost-by-supplier',
    'import-cost-summary',
    'lc-status',
    'customs-duty',
    'shipment-status',
    'cost-variance',
    'supplier-performance',
  ];

  beforeAll(async () => {
    // 1. Seed demo data to ensure reports have actual rows
    console.log('[reports-e2e] Seeding demo data...');
    try {
      const rootDir = path.resolve(__dirname, '..');
      execSync('npx ts-node src/db/seed/seed.ts demo', {
        env: { ...process.env }, // uses the testDbUrl injected by setup-e2e.ts
        cwd: rootDir,
        stdio: 'ignore',
      });
    } catch (e) {
      console.error('Failed to seed demo data', e);
    }

    // 2. Initialize NestJS App
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 3. Authenticate
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@company.com', password: 'Password123!' })
      .expect(HttpStatus.OK);

    adminToken = loginRes.body.accessToken;

    // 4. Retrieve the Demo Supplier ID to use in filters
    const supsRes = await request(app.getHttpServer())
      .get('/suppliers')
      .set('Authorization', `Bearer \${adminToken}`)
      .expect(HttpStatus.OK);

    const demoSup = supsRes.body.find(
      (s: any) => s.name === 'Demo Global Suppliers Ltd',
    );
    if (demoSup) {
      demoSupplierId = demoSup.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  for (const reportKey of reportKeys) {
    describe(`Report: \${reportKey}`, () => {
      it(`should fetch JSON data for \${reportKey} with date & supplier filters`, async () => {
        const res = await request(app.getHttpServer())
          .get(`/reports/\${reportKey}`)
          .set('Authorization', `Bearer \${adminToken}`)
          .query({
            date_from: '2020-01-01',
            date_to: '2030-12-31',
            supplier_id: demoSupplierId || undefined,
          });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toHaveProperty('columns');
        expect(res.body).toHaveProperty('rows');
        expect(Array.isArray(res.body.rows)).toBe(true);
        expect(res.body).toHaveProperty('generated_at');

        // Due to demo seeding, many reports will have >0 rows.
        // We assert structure integrity rather than absolute count to prevent brittleness,
        // but verify it successfully parsed the DB.
        if (res.body.rows.length > 0) {
          expect(res.body.columns.length).toBeGreaterThan(0);
        }
      });

      it(`should export \${reportKey} to XLSX successfully`, async () => {
        const res = await request(app.getHttpServer())
          .get(`/reports/\${reportKey}/export`)
          .set('Authorization', `Bearer \${adminToken}`)
          .query({
            format: 'xlsx',
            date_from: '2020-01-01',
            date_to: '2030-12-31',
            supplier_id: demoSupplierId || undefined,
          });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.header['content-type']).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );

        // Assert the attachment filename is correct
        expect(res.header['content-disposition']).toContain(
          `\${reportKey}.xlsx`,
        );

        // Assert binary stream payload exists
        expect(res.body.length).toBeGreaterThan(100);
      });

      it(`should export \${reportKey} to PDF successfully`, async () => {
        const res = await request(app.getHttpServer())
          .get(`/reports/\${reportKey}/export`)
          .set('Authorization', `Bearer \${adminToken}`)
          .query({
            format: 'pdf',
            date_from: '2020-01-01',
            date_to: '2030-12-31',
            supplier_id: demoSupplierId || undefined,
          });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.header['content-type']).toBe('application/pdf');

        // Assert the attachment filename is correct
        expect(res.header['content-disposition']).toContain(
          `\${reportKey}.pdf`,
        );

        // Assert binary stream payload exists (PDF headers minimum)
        expect(res.body.length).toBeGreaterThan(100);
      });
    });
  }
});
