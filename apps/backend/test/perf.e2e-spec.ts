import { INestApplication, HttpStatus } from '@nestjs/common';
import request from './e2e-request';
import { createE2eApp } from './create-e2e-app';
import { execSync } from 'child_process';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../src/db/db.token';
import * as schema from '../src/db/schema';

describe('Performance Benchmarks (e2e) (TC-PERF01)', () => {
  let app: INestApplication;
  let adminToken = '';
  let approverToken = '';

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
    execSync('npx ts-node src/db/seed/seed.ts perf', {
      env: { ...process.env },
      cwd: rootDir,
      stdio: 'ignore',
    });

    app = await createE2eApp();

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@company.com', password: 'Password123!' })
      .expect(HttpStatus.OK);

    adminToken = loginRes.body.accessToken;
    const approverLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'executive@company.com', password: 'Password123!' })
      .expect(HttpStatus.OK);
    approverToken = approverLogin.body.accessToken;

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
        name: 'Perf 200 Supplier',
        country: 'US',
        defaultCurrency: 'USD',
        leadTimeDays: 10,
      });
    entities.supplierId = supRes.body.id;

    // 2. Create an Item
    const itemRes = await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemCode: 'ITM-PERF-200',
        name: 'Perf 200 Item',
        defaultHsCode: '8517.13.00',
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
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ comment: 'Approved' });

    const poFetch = await request(app.getHttpServer())
      .get(`/purchase-orders/${entities.poId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const fetchedLines = poFetch.body.poLines;

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
    const codes = ['FREIGHT', 'INSURANCE', 'PORT_HANDLING', 'BANK_CHARGES'];

    for (let i = 0; i < 4; i++) {
      const costResponse = await request(app.getHttpServer())
        .post(`/import-shipments/${entities.shipmentId}/cost-entries`)
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
      expect(costResponse.status).toBe(HttpStatus.CREATED);
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
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      console.log(
        `[perf-e2e] Shipment Listing (10k+ db rows) took: ${durationMs}ms`,
      );
      expect(durationMs).toBeLessThan(2000);
    });

    it('should load a 10,000-entry shipment cost register in under 2 seconds', async () => {
      const db = app.get<DrizzleDB>(DRIZZLE);
      const admin = await db.query.users.findFirst({
        where: eq(schema.users.email, 'admin@company.com'),
      });
      const freightCategoryId = entities.categories.FREIGHT;
      if (!admin || !freightCategoryId) {
        throw new Error('Performance test user or freight category was not seeded');
      }

      const entryCount = 10_000;
      const batchSize = 1_000;
      for (let offset = 0; offset < entryCount; offset += batchSize) {
        await db.insert(schema.importCostEntries).values(
          Array.from({ length: batchSize }, (_, index) => ({
            shipmentId: entities.shipmentId,
            costCategoryId: freightCategoryId,
            providerName: 'Performance Fixture',
            invoiceNumber: `PERF-COST-${offset + index}`,
            invoiceDate: '2026-01-02',
            amountForeign: '1.0000',
            currency: 'ETB',
            fxRate: '1.000000',
            amountEtb: '1.0000',
            allocationMethod: 'by_value' as const,
            isEstimated: true,
            createdBy: admin.id,
          })),
        );
      }

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get(`/import-shipments/${entities.shipmentId}/cost-entries`)
        .set('Authorization', `Bearer ${adminToken}`);
      const durationMs = Date.now() - startTime;

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(entryCount + 4);
      console.log(`[perf-e2e] Cost register (10k entries) took: ${durationMs}ms`);
      expect(durationMs).toBeLessThan(2000);
    });

    it('should generate every 12-month report within the 10-second SRS limit', async () => {
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

      for (const reportKey of reportKeys) {
        const startedAt = Date.now();
        const response = await request(app.getHttpServer())
          .get(`/reports/${reportKey}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            date_from: '2025-11-12',
            date_to: '2026-11-12',
            item_id: entities.itemId,
          });
        const durationMs = Date.now() - startedAt;

        expect(response.status).toBe(HttpStatus.OK);
        console.log(`[perf-e2e] Report ${reportKey} took: ${durationMs}ms`);
        expect(durationMs).toBeLessThan(10_000);
      }
    });
  });
});
