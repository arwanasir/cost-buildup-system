import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Procurement & LC (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';

  const supplier = {
    id: '',
    supplierCode: 'SUP-E2E-01',
    name: 'E2E Test Supplier',
    country: 'CN',
  };

  const item = {
    id: '',
    itemCode: 'ITM-E2E-01',
    name: 'E2E Test Item',
    defaultHsCode: '8517.12.00',
    unitOfMeasure: 'PCS',
  };

  const poUnderThreshold = {
    id: '',
  };

  const poOverThreshold = {
    id: '',
  };

  const lc1 = {
    id: '',
  };

  const shipment = {
    id: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as system_admin to perform all actions
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@company.com', password: 'Password123!' })
      .expect(HttpStatus.OK);

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Master Data Setup', () => {
    it('should create a supplier', async () => {
      const res = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          supplierCode: supplier.supplierCode,
          name: supplier.name,
          country: supplier.country,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      supplier.id = res.body.id;
    });

    it('should create an item', async () => {
      const res = await request(app.getHttpServer())
        .post('/items')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          itemCode: item.itemCode,
          name: item.name,
          defaultHsCode: item.defaultHsCode,
          unitOfMeasure: item.unitOfMeasure,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      item.id = res.body.id;
    });
  });

  describe('2. Purchase Orders & Approval Routing', () => {
    it('should create a PO under threshold (< 50,000 USD)', async () => {
      const res = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          poDate: '2026-01-01',
          supplierId: supplier.id,
          incoterm: 'FOB',
          currency: 'USD',
          fxRate: 120.0,
          lines: [
            {
              itemId: item.id,
              quantity: 100,
              unitOfMeasure: 'PCS',
              unitPrice: 100, // Total: 10,000 USD
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      poUnderThreshold.id = res.body.id;
    });

    it('should create a PO over threshold (> 100,000 USD)', async () => {
      const res = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          poDate: '2026-01-01',
          supplierId: supplier.id,
          incoterm: 'FOB',
          currency: 'USD',
          fxRate: 120.0,
          lines: [
            {
              itemId: item.id,
              quantity: 1000,
              unitOfMeasure: 'PCS',
              unitPrice: 150, // Total: 150,000 USD
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      poOverThreshold.id = res.body.id;
    });

    it('should submit POs to pending_approval', async () => {
      await request(app.getHttpServer())
        .post(`/purchase-orders/\${poUnderThreshold.id}/submit`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .post(`/purchase-orders/\${poOverThreshold.id}/submit`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);
    });

    it('should approve POs using admin token', async () => {
      // System admin has level 100, which satisfies finance_officer (30) and general_manager (50)
      await request(app.getHttpServer())
        .post(`/purchase-orders/\${poUnderThreshold.id}/approve`)
        .set('Authorization', `Bearer \${adminToken}`)
        .send({ comment: 'Approved under threshold' })
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .post(`/purchase-orders/\${poOverThreshold.id}/approve`)
        .set('Authorization', `Bearer \${adminToken}`)
        .send({ comment: 'Approved over threshold' })
        .expect(HttpStatus.CREATED);
    });
  });

  describe('3. Letter of Credit Creation & BR08', () => {
    it('should create LC with approved PO (LC 1)', async () => {
      const res = await request(app.getHttpServer())
        .post('/letters-of-credit')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          lcNumber: 'LC-E2E-01',
          poIds: [poUnderThreshold.id],
          issuingBank: 'Commercial Bank of Ethiopia',
          lcType: 'sight',
          amountForeign: 10000,
          currency: 'USD',
          fxRate: 120.0,
          openingDate: '2026-01-02',
          expiryDate: '2026-06-02',
          requiredDocuments: [{ documentType: 'bl', isRequired: true }],
        })
        .expect(HttpStatus.CREATED);

      lc1.id = res.body.id;
    });

    it('should fail to create LC 2 using the same PO due to BR08', async () => {
      const res = await request(app.getHttpServer())
        .post('/letters-of-credit')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          lcNumber: 'LC-E2E-02',
          poIds: [poUnderThreshold.id],
          issuingBank: 'Commercial Bank of Ethiopia',
          lcType: 'sight',
          amountForeign: 10000,
          currency: 'USD',
          fxRate: 120.0,
          expiryDate: '2026-06-02',
          requiredDocuments: [{ documentType: 'bl', isRequired: true }],
        });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.body.message).toContain('BR08');
    });
  });

  describe('4. LC Charge Auto-Pulled to Cost Entries (TC-LC-02)', () => {
    it('should create a shipment for LC 1', async () => {
      const res = await request(app.getHttpServer())
        .post('/import-shipments')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          poId: poUnderThreshold.id,
          eta: '2026-02-01',
          items: [
            {
              poLineId: 'dummy', // the service doesn't validate this strictly in DTO? We need real poLineId
            },
          ],
        });

      // Wait, let's fetch the PO to get its poLineId
      const poRes = await request(app.getHttpServer())
        .get(`/purchase-orders/\${poUnderThreshold.id}`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.OK);

      const poLineId = poRes.body.lines[0].id;

      const shipmentRes = await request(app.getHttpServer())
        .post('/import-shipments')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          poId: poUnderThreshold.id,
          eta: '2026-02-01',
          items: [
            {
              poLineId: poLineId,
              shippedQuantity: 100,
              ciUnitPrice: 100,
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      shipment.id = shipmentRes.body.id;
    });

    it('should transition LC status and GM approve', async () => {
      // It's already 'applied' initially. We just need to GM approve.
      await request(app.getHttpServer())
        .post(`/letters-of-credit/\${lc1.id}/gm-approve`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);
    });

    it('should amend LC and auto-pull bank charge to cost entry', async () => {
      await request(app.getHttpServer())
        .post(`/letters-of-credit/\${lc1.id}/amendments`)
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          description: 'Added 500 ETB amendment fee',
          amendmentFeeEtb: 500,
        })
        .expect(HttpStatus.CREATED);

      // Check that a cost entry was auto-pulled for the shipment
      const costRes = await request(app.getHttpServer())
        .get(`/import-shipments/\${shipment.id}/cost-entries`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.OK);

      const amendmentCharge = costRes.body.find(
        (c: any) => c.costSubcategory === 'amendment_fee',
      );
      expect(amendmentCharge).toBeDefined();
      expect(Number(amendmentCharge.amountEtb)).toBe(500);
      expect(amendmentCharge.source).toBe('auto_pulled'); // Optional check if mapped this way
    });
  });
});
