import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import * as path from 'path';
import * as fs from 'fs';

describe('Shipment, CI & Customs (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';

  const entities = {
    supplierId: '',
    itemId: '',
    poId: '',
    poLineId: '',
    lcId: '',
    shipmentId: '',
    shipmentItemId: '',
    ciId: '',
    declarationId: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as system_admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@company.com', password: 'Password123!' })
      .expect(HttpStatus.OK);

    adminToken = loginRes.body.accessToken;

    // --- Prerequisites Setup ---
    // 1. Supplier
    const supRes = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        supplierCode: 'SUP-CUST-01',
        name: 'Customs Test Supplier',
        country: 'CN',
      })
      .expect(HttpStatus.CREATED);
    entities.supplierId = supRes.body.id;

    // 2. Item
    const itemRes = await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        itemCode: 'ITM-CUST-01',
        name: 'Customs Test Item',
        defaultHsCode: '8517.12.00',
        unitOfMeasure: 'PCS',
      })
      .expect(HttpStatus.CREATED);
    entities.itemId = itemRes.body.id;

    // 3. Purchase Order (Under threshold to avoid complex GM approval, just admin can do it)
    const poRes = await request(app.getHttpServer())
      .post('/purchase-orders')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        poDate: '2026-03-01',
        supplierId: entities.supplierId,
        incoterm: 'FOB',
        currency: 'USD',
        fxRate: 120.0,
        lines: [
          {
            itemId: entities.itemId,
            quantity: 100,
            unitOfMeasure: 'PCS',
            unitPrice: 100,
          },
        ],
      })
      .expect(HttpStatus.CREATED);
    entities.poId = poRes.body.id;

    // 4. Submit & Approve PO
    await request(app.getHttpServer())
      .post(`/purchase-orders/\${entities.poId}/submit`)
      .set('Authorization', `Bearer \${adminToken}`)
      .expect(HttpStatus.CREATED);
    await request(app.getHttpServer())
      .post(`/purchase-orders/\${entities.poId}/approve`)
      .set('Authorization', `Bearer \${adminToken}`)
      .send({ comment: 'Approved' })
      .expect(HttpStatus.CREATED);

    // Get PO to extract poLineId
    const poFetch = await request(app.getHttpServer())
      .get(`/purchase-orders/\${entities.poId}`)
      .set('Authorization', `Bearer \${adminToken}`);
    entities.poLineId = poFetch.body.lines[0].id;

    // 5. Letter of Credit
    const lcRes = await request(app.getHttpServer())
      .post('/letters-of-credit')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        lcNumber: 'LC-CUST-01',
        poIds: [entities.poId],
        issuingBank: 'Test Bank',
        lcType: 'sight',
        amountForeign: 10000,
        currency: 'USD',
        fxRate: 120.0,
        expiryDate: '2026-08-01',
        requiredDocuments: [{ documentType: 'bl', isRequired: true }],
      })
      .expect(HttpStatus.CREATED);
    entities.lcId = lcRes.body.id;

    // GM Approve LC
    await request(app.getHttpServer())
      .post(`/letters-of-credit/\${entities.lcId}/gm-approve`)
      .set('Authorization', `Bearer \${adminToken}`)
      .expect(HttpStatus.CREATED);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Shipment & Documents (MinIO)', () => {
    it('should create a shipment', async () => {
      const res = await request(app.getHttpServer())
        .post('/import-shipments')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          poId: entities.poId,
          eta: '2026-05-01',
          items: [
            {
              poLineId: entities.poLineId,
              shippedQuantity: 100,
              ciUnitPrice: 100,
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      entities.shipmentId = res.body.id;
    });

    it('should upload a document to MinIO', async () => {
      const buffer = Buffer.from('dummy pdf content for minio testing');
      const res = await request(app.getHttpServer())
        .post(`/import-shipments/\${entities.shipmentId}/documents`)
        .set('Authorization', `Bearer \${adminToken}`)
        .field('documentType', 'bl')
        .field('referenceNumber', 'BL-999888')
        .field('documentDate', '2026-04-01')
        .attach('file', buffer, 'bill_of_lading.pdf')
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(res.body.objectKey).toBeDefined(); // Points to MinIO storage key
    });
  });

  describe('Commercial Invoice & BR11 Alert', () => {
    it('should fetch shipment to get shipmentItem ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/import-shipments/\${entities.shipmentId}/items`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.OK);

      entities.shipmentItemId = res.body[0].id;
    });

    it('should create a CI triggering BR11 price variance alert', async () => {
      // PO unit price was 100. Let's send CI unit price as 120 (20% variance).
      // BR11 triggers at >10% variance.
      const res = await request(app.getHttpServer())
        .post(`/import-shipments/\${entities.shipmentId}/commercial-invoice`)
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          invoiceNumber: 'INV-112233',
          invoiceDate: '2026-04-10',
          currency: 'USD',
          fxRate: 120.0,
          items: [
            {
              shipmentItemId: entities.shipmentItemId,
              ciUnitPrice: 120, // High price!
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      entities.ciId = res.body.id;
      // Expect the priceVariancePct to be around 20.0000
      expect(Number(res.body.priceVariancePct)).toBeGreaterThan(10);
      // Because it exceeds the threshold, acknowledgedAt should remain null
      expect(res.body.acknowledgedAt).toBeNull();
    });

    it('should allow procurement manager to acknowledge the variance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/import-shipments/\${entities.ciId}/acknowledge`) // Wait, route is import-shipments/:id/acknowledge
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);

      expect(res.body.acknowledgedAt).not.toBeNull();
    });
  });

  describe('Customs Workflow (Declare, Assess, Pay, Release)', () => {
    it('should declare customs', async () => {
      const res = await request(app.getHttpServer())
        .post('/customs')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          declarationNumber: 'DEC-0001',
          declarationDate: '2026-05-02',
          fxRate: 120.5,
        })
        .expect(HttpStatus.CREATED);

      entities.declarationId = res.body.id;
      expect(res.body.status).toBe('draft');
    });

    it('should assess the declaration', async () => {
      const res = await request(app.getHttpServer())
        .post(`/customs/\${entities.declarationId}/assess`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);

      expect(res.body.status).toBe('assessed');
    });

    it('should record duty payment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/customs/\${entities.declarationId}/payments`)
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          paymentDate: '2026-05-05',
          bankReference: 'CBE-9876',
          amountPaidEtb: 150000,
          receiptNumber: 'RCPT-123',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.status).toBe('paid');
    });

    it('should release the shipment from customs', async () => {
      const res = await request(app.getHttpServer())
        .post(`/customs/\${entities.declarationId}/release`)
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          releaseDate: '2026-05-06',
          releaseReference: 'REL-4455',
          customsOfficer: 'Officer John',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.status).toBe('released');
    });
  });
});
