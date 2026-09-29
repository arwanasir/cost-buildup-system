import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { execSync } from 'child_process';
import * as path from 'path';

describe('Performance Benchmarks (e2e) (TC-PERF01)', () => {
  let app: INestApplication;
  let adminToken = '';

  // Set larger timeout for perf data seeding and stress tests
  jest.setTimeout(120000);

  const entities = {
    supplierId: '',
    itemId: '',
    poId: '',
    shipmentId: '',
    categories: {} as Record<string, string>,
  };

  beforeAll(async () => {
    console.log('[perf-e2e] Initializing application...');

    // Seed 10,000 POs and Shipments
    const rootDir = path.resolve(__dirname, '..');
    console.log(
      '[perf-e2e] Running seed script for 10,000 rows (this may take a minute)...',
    );
    try {
      execSync('npx ts-node src/db/seed/seed.ts perf', {
        env: { ...process.env },
        cwd: rootDir,
        stdio: 'ignore',
      });
    } catch (e) {
      console.error('Failed to seed perf data', e);
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@company.com', password: 'Password123!' })
      .expect(HttpStatus.OK);

    adminToken = loginRes.body.accessToken;

    // Fetch Cost Categories
    const catRes = await request(app.getHttpServer())
      .get('/cost-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.OK);
    for (const cat of catRes.body) {
      entities.categories[cat.code] = cat.id;
    }

    // 1. Create a Supplier
    const supRes = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierCode: 'SUP-PERF-200',
        name: 'Perf 200 Supplier',
        country: 'US',
      });
    entities.supplierId = supRes.body.id;

    // 2. Create an Item
    const itemRes = await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemCode: 'ITM-PERF-200',
        name: 'Perf 200 Item',
        defaultHsCode: '8517.12.00',
        unitOfMeasure: 'PCS',
      });
    entities.itemId = itemRes.body.id;

    console.log('[perf-e2e] Setting up 200-line PO and Shipment...');

    // 3. Create a 200-line PO
    const lines = Array.from({ length: 200 }).map((_, i) => ({
      itemId: entities.itemId,
      quantity: 10,
      unitOfMeasure: 'PCS',
      unitPrice: 100,
    }));

    const poRes = await request(app.getHttpServer())
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        poDate: '2026-01-01',
        supplierId: entities.supplierId,
        incoterm: 'FOB',
        currency: 'USD',
        fxRate: 120.0,
        lines,
      });
    entities.poId = poRes.body.id;

    // Submit & Approve PO
    await request(app.getHttpServer())
      .post(`/purchase-orders/${entities.poId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`);
    await request(app.getHttpServer())
      .post(`/purchase-orders/${entities.poId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Approved' });

    const poFetch = await request(app.getHttpServer())
      .get(`/purchase-orders/${entities.poId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const fetchedLines = poFetch.body.lines;

    // 4. Create a 200-line Shipment
    const shipItems = fetchedLines.map((line: any) => ({
      poLineId: line.id,
      shippedQuantity: 10,
      ciUnitPrice: 100,
      weightKg: 5,
      volumeCbm: 1,
    }));

    const shipRes = await request(app.getHttpServer())
      .post('/import-shipments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        poId: entities.poId,
        totalWeightKg: 1000,
        totalVolumeCbm: 200,
        items: shipItems,
      });
    entities.shipmentId = shipRes.body.id;

    // Add multiple cost entries with different allocation strategies to strain the engine
    const strategies = ['by_weight', 'by_value', 'by_volume', 'by_quantity'];
    const codes = ['freight', 'insurance', 'duty', 'bank_charge'];

    for (let i = 0; i < 4; i++) {
      await request(app.getHttpServer())
        .post('/cost-entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          costCategoryId: entities.categories[codes[i]],
          providerName: `Provider ${i}`,
          invoiceNumber: `INV-${i}`,
          invoiceDate: '2026-01-02',
          amountForeign: 5000,
          currency: 'ETB',
          fxRate: 1.0,
          allocationMethod: strategies[i],
          isEstimated: true,
        });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Allocation Engine Performance', () => {
    it('should allocate a 200-line shipment with multiple strategies in under 3 seconds', async () => {
      const startTime = Date.now();

      const res = await request(app.getHttpServer())
        .post(`/import-shipments/${entities.shipmentId}/landed-cost/compute`)
        .set('Authorization', `Bearer ${adminToken}`);

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      expect(res.status).toBe(HttpStatus.CREATED);

      console.log(
        `[perf-e2e] 200-line multi-strategy allocation took: ${durationMs}ms`,
      );
      expect(durationMs).toBeLessThan(3000); // SRS 5.1 & TC-PERF01
    });
  });

  describe('2. Listing Performance (10,000+ Rows)', () => {
    it('should list POs within an acceptable 2-second threshold despite 10,000+ rows (pagination/filtering)', async () => {
      const startTime = Date.now();

      const res = await request(app.getHttpServer())
        .get('/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 50, page: 1 }); // Realistic UI fetch

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.data.length).toBeGreaterThan(0);

      console.log(`[perf-e2e] PO Listing (10k+ db rows) took: ${durationMs}ms`);
      expect(durationMs).toBeLessThan(2000); // SRS 5.1 & TC-PERF01
    });

    it('should list Shipments within an acceptable 2-second threshold despite 10,000+ rows', async () => {
      const startTime = Date.now();

      const res = await request(app.getHttpServer())
        .get('/import-shipments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 50, page: 1 });

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.data.length).toBeGreaterThan(0);

      console.log(
        `[perf-e2e] Shipment Listing (10k+ db rows) took: ${durationMs}ms`,
      );
      expect(durationMs).toBeLessThan(2000);
    });
  });
});
