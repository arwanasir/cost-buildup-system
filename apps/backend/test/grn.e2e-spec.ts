import { INestApplication, HttpStatus } from '@nestjs/common';
import request from './e2e-request';
import { createE2eApp } from './create-e2e-app';
import nock from 'nock';

const ERP_BASE_URL = process.env.ERP_BASE_URL || 'http://localhost:3001';

describe('Goods Receipts (GRN) & ERP Sync (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';
  let approverToken = '';

  const entities = {
    supplierId: '',
    itemId: '',
    poId: '',
    poLineId: '',
    lcId: '',
    shipmentId: '',
    shipmentItemId: '',
    grnId: '',
  };

  beforeAll(async () => {
    app = await createE2eApp();

    // Prevent real external requests during tests
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');

    // Login as system_admin
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

    // --- Prerequisites Setup ---
    const supRes = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'GRN Test Supplier',
        country: 'CN',
        defaultCurrency: 'USD',
        leadTimeDays: 10,
      });
    entities.supplierId = supRes.body.id;

    const itemRes = await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemCode: 'ITM-GRN-01',
        name: 'GRN Test Item',
        defaultHsCode: '8517.13.00',
        unitOfMeasure: 'PCS',
      });
    entities.itemId = itemRes.body.id;

    const poRes = await request(app.getHttpServer())
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        poDate: '2026-06-01',
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
      });
    entities.poId = poRes.body.id;

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
    entities.poLineId = poFetch.body.poLines[0].id;

    const lcRes = await request(app.getHttpServer())
      .post('/letters-of-credit')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lcNumber: 'LC-GRN-01',
        poIds: [entities.poId],
        issuingBank: 'Test Bank',
        lcType: 'sight',
        amountForeign: 10000,
        currency: 'USD',
        fxRate: 120.0,
        expiryDate: '2026-12-01',
        requiredDocuments: [{ documentType: 'bl', isRequired: true }],
      });
    entities.lcId = lcRes.body.id;
    await request(app.getHttpServer())
      .post(`/letters-of-credit/${entities.lcId}/gm-approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const shipRes = await request(app.getHttpServer())
      .post('/import-shipments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        poId: entities.poId,
        eta: '2026-07-01',
        items: [
          {
            poLineId: entities.poLineId,
            shippedQuantity: 100,
            ciUnitPrice: 100,
          },
        ],
      });
    entities.shipmentId = shipRes.body.id;

    const shipItemsRes = await request(app.getHttpServer())
      .get(`/import-shipments/${entities.shipmentId}/items`)
      .set('Authorization', `Bearer ${adminToken}`);
    entities.shipmentItemId = shipItemsRes.body[0].id;
  });

  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    await app.close();
  });

  describe('1. GRN Pre-Release Blocking', () => {
    it('should block GRN creation before customs release (BR01A)', async () => {
      const res = await request(app.getHttpServer())
        .post('/goods-receipts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          receiptDate: '2026-07-05',
          warehouseLocation: 'Main Warehouse',
          items: [
            {
              shipmentItemId: entities.shipmentItemId,
              receivedQuantity: 100,
              inspectionResult: 'accepted',
              acceptedQuantity: 100,
              rejectedQuantity: 0,
            },
          ],
        });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.body.message).toContain('BR01A');
    });

    it('should allow setting shipment status to cleared', async () => {
      await request(app.getHttpServer())
        .post(`/import-shipments/${entities.shipmentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'shipped' })
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .post(`/import-shipments/${entities.shipmentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'at_customs', actualArrivalDate: '2026-07-02' })
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .post(`/import-shipments/${entities.shipmentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cleared' })
        .expect(HttpStatus.CREATED);
    });
  });

  describe('2. GRN Creation with Rejected Lines', () => {
    it('should create GRN successfully with partial rejection', async () => {
      const res = await request(app.getHttpServer())
        .post('/goods-receipts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          receiptDate: '2026-07-05',
          warehouseLocation: 'Main Warehouse',
          items: [
            {
              shipmentItemId: entities.shipmentItemId,
              receivedQuantity: 100,
              inspectionResult: 'accepted_with_conditions',
              acceptedQuantity: 90,
              rejectedQuantity: 10,
              rejectionReason: 'Damaged in transit',
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      entities.grnId = res.body.grn.id;
      expect(res.body.grn.status).toBe('draft');
    });

    it('should have auto-generated claims for the rejected items', async () => {
      const claimsRes = await request(app.getHttpServer())
        .get(`/goods-receipts/${entities.grnId}/claims`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      // Claims are created when the GRN is confirmed, not at draft creation.
      expect(claimsRes.body).toHaveLength(0);
    });
  });

  describe('3. GRN Confirmation & ERP Sync', () => {
    it('should confirm the GRN', async () => {
      const res = await request(app.getHttpServer())
        .post(`/goods-receipts/${entities.grnId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED);

      expect(res.body.message).toContain('confirmed');

      const claimsRes = await request(app.getHttpServer())
        .get(`/goods-receipts/${entities.grnId}/claims`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
      expect(claimsRes.body).toHaveLength(1);
      expect(Number(claimsRes.body[0].quantity)).toBe(10);
      expect(claimsRes.body[0].status).toBe('open');
    });

    it('should fail ERP posting and retry until posting_failed state is reached (TC-GRN01)', async () => {
      // Mock finance API success
      nock(ERP_BASE_URL)
        .post('/finance/journal-entries')
        .reply(200, { transaction_id: 'FIN-123' })
        .persist();

      // Mock inventory API failure
      nock(ERP_BASE_URL)
        .post('/inventory/postings')
        .reply(500, { error: 'Internal Server Error' })
        .persist();

      // Attempt 1
      await request(app.getHttpServer())
        .post(`/goods-receipts/${entities.grnId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      // Attempt 2
      await request(app.getHttpServer())
        .post(`/goods-receipts/${entities.grnId}/retry-posting`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      // Attempt 3 (exhaustion)
      await request(app.getHttpServer())
        .post(`/goods-receipts/${entities.grnId}/retry-posting`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      // Check status should now be posting_failed
      const fetchRes = await request(app.getHttpServer())
        .get(`/goods-receipts/${entities.grnId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(fetchRes.body.grn.status).toBe('posting_failed');

      const filteredRes = await request(app.getHttpServer())
        .get('/goods-receipts?status=posting_failed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
      expect(filteredRes.body).toContainEqual(
        expect.objectContaining({
          id: entities.grnId,
          status: 'posting_failed',
        }),
      );
      expect(
        filteredRes.body.every((grn: any) => grn.status === 'posting_failed'),
      ).toBe(true);
    });

    it('should succeed after ERP is restored and we retry', async () => {
      // Remove old nock interceptors
      nock.cleanAll();

      // Mock both as successful
      nock(ERP_BASE_URL)
        .post('/finance/journal-entries')
        .reply(200, { transaction_id: 'FIN-123' });

      nock(ERP_BASE_URL)
        .post('/inventory/postings')
        .reply(200, { transaction_id: 'INV-123' });

      await request(app.getHttpServer())
        .post(`/goods-receipts/${entities.grnId}/retry-posting`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED);

      // A GRN posted using estimated costs remains visible for adjustment.
      const fetchRes = await request(app.getHttpServer())
        .get(`/goods-receipts/${entities.grnId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(fetchRes.body.grn.status).toBe('flagged_for_adjustment');
    });
  });
});
