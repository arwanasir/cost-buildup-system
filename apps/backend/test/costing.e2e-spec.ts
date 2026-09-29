import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Costing, Allocation & Finalisation (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';

  const entities = {
    supplierId: '',
    itemId: '',
    poId: '',
    poLineId: '',
    lcId: '',
    shipmentId: '',
    ciId: '',
    categories: {} as Record<string, string>,
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

    // Fetch Cost Categories
    const catRes = await request(app.getHttpServer())
      .get('/cost-categories')
      .set('Authorization', `Bearer \${adminToken}`)
      .expect(HttpStatus.OK);

    for (const cat of catRes.body) {
      entities.categories[cat.code] = cat.id;
    }

    // --- Prerequisites Setup ---
    // 1. Supplier
    const supRes = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        supplierCode: 'SUP-COST-01',
        name: 'Costing Test Supplier',
        country: 'CN',
      });
    entities.supplierId = supRes.body.id;

    // 2. Item
    const itemRes = await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        itemCode: 'ITM-COST-01',
        name: 'Costing Test Item',
        defaultHsCode: '8517.12.00',
        unitOfMeasure: 'PCS',
      });
    entities.itemId = itemRes.body.id;

    // 3. Purchase Order (with explicit low estimates to trigger variances later)
    const poRes = await request(app.getHttpServer())
      .post('/purchase-orders')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        poDate: '2026-06-01',
        supplierId: entities.supplierId,
        incoterm: 'FOB',
        currency: 'USD',
        fxRate: 120.0,
        estimatedFreightEtb: 1000,
        estimatedDutyEtb: 1000,
        lines: [
          {
            itemId: entities.itemId,
            quantity: 100,
            unitOfMeasure: 'PCS',
            unitPrice: 100,
          }, // Total 10,000 USD
        ],
      });
    entities.poId = poRes.body.id;

    // Submit & Approve PO
    await request(app.getHttpServer())
      .post(`/purchase-orders/\${entities.poId}/submit`)
      .set('Authorization', `Bearer \${adminToken}`);
    await request(app.getHttpServer())
      .post(`/purchase-orders/\${entities.poId}/approve`)
      .set('Authorization', `Bearer \${adminToken}`)
      .send({ comment: 'Approved' });

    const poFetch = await request(app.getHttpServer())
      .get(`/purchase-orders/\${entities.poId}`)
      .set('Authorization', `Bearer \${adminToken}`);
    entities.poLineId = poFetch.body.lines[0].id;

    // 4. Letter of Credit
    const lcRes = await request(app.getHttpServer())
      .post('/letters-of-credit')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        lcNumber: 'LC-COST-01',
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
      .post(`/letters-of-credit/\${entities.lcId}/gm-approve`)
      .set('Authorization', `Bearer \${adminToken}`);

    // 5. Shipment
    const shipRes = await request(app.getHttpServer())
      .post('/import-shipments')
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        poId: entities.poId,
        eta: '2026-07-01',
        totalWeightKg: 500,
        totalVolumeCbm: 10,
        items: [
          {
            poLineId: entities.poLineId,
            shippedQuantity: 100,
            ciUnitPrice: 100,
            weightKg: 500,
            volumeCbm: 10,
          },
        ],
      });
    entities.shipmentId = shipRes.body.id;

    // 6. Commercial Invoice (Needed for variances evaluation BR07)
    const shipItemsRes = await request(app.getHttpServer())
      .get(`/import-shipments/\${entities.shipmentId}/items`)
      .set('Authorization', `Bearer \${adminToken}`);
    const shipmentItemId = shipItemsRes.body[0].id;

    const ciRes = await request(app.getHttpServer())
      .post(`/import-shipments/\${entities.shipmentId}/commercial-invoice`)
      .set('Authorization', `Bearer \${adminToken}`)
      .send({
        invoiceNumber: 'INV-COST-123',
        invoiceDate: '2026-06-15',
        currency: 'USD',
        fxRate: 120.0,
        items: [{ shipmentItemId: shipmentItemId, ciUnitPrice: 100 }],
      });
    entities.ciId = ciRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Cost Entries & Allocation (TC-ALLOC, TC-COST01)', () => {
    it('should add cost entries with all 4 allocation methods', async () => {
      // 1. Freight - by_weight (ACTUAL, huge variance)
      await request(app.getHttpServer())
        .post('/cost-entries')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          costCategoryId: entities.categories['freight'],
          providerName: 'Ocean Line',
          invoiceNumber: 'INV-FR-1',
          invoiceDate: '2026-06-20',
          amountForeign: 500000, // Very high to trigger > variance threshold compared to 1000 ETB
          currency: 'ETB',
          fxRate: 1.0,
          allocationMethod: 'by_weight',
          isEstimated: false,
        })
        .expect(HttpStatus.CREATED);

      // 2. Duty - by_value (ESTIMATED)
      await request(app.getHttpServer())
        .post('/cost-entries')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          costCategoryId: entities.categories['duty'],
          providerName: 'Customs Auth',
          invoiceNumber: 'EST-DUTY',
          invoiceDate: '2026-06-20',
          amountForeign: 5000,
          currency: 'ETB',
          fxRate: 1.0,
          allocationMethod: 'by_value',
          isEstimated: true,
        })
        .expect(HttpStatus.CREATED);

      // 3. Insurance - by_volume (ESTIMATED)
      await request(app.getHttpServer())
        .post('/cost-entries')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          costCategoryId: entities.categories['insurance'],
          providerName: 'Safe Insure',
          invoiceNumber: 'EST-INS',
          invoiceDate: '2026-06-20',
          amountForeign: 200,
          currency: 'USD',
          fxRate: 120.0,
          allocationMethod: 'by_volume',
          isEstimated: true,
        })
        .expect(HttpStatus.CREATED);

      // 4. Bank Charge - by_quantity (ESTIMATED)
      await request(app.getHttpServer())
        .post('/cost-entries')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          costCategoryId: entities.categories['bank_charge'],
          providerName: 'Test Bank',
          invoiceNumber: 'EST-BNK',
          invoiceDate: '2026-06-20',
          amountForeign: 500,
          currency: 'ETB',
          fxRate: 1.0,
          allocationMethod: 'by_quantity',
          isEstimated: true,
        })
        .expect(HttpStatus.CREATED);
    });

    it('should compute landed cost allocations successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/import-shipments/\${entities.shipmentId}/landed-cost/compute`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('computedAt');
    });
  });

  describe('2. Variances & Finalisation (TC-VAR-01, TC-FINAL01)', () => {
    it('should evaluate variances and flag freight as pending_approval', async () => {
      await request(app.getHttpServer())
        .post(`/shipments/\${entities.shipmentId}/variances/evaluate`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);

      const res = await request(app.getHttpServer())
        .get(`/shipments/\${entities.shipmentId}/variances`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.OK);

      const freightVar = res.body.find(
        (v: any) => v.costCategoryCode === 'freight',
      );
      expect(freightVar).toBeDefined();
      expect(freightVar.status).toBe('pending_approval');
    });

    it('should block finalisation while estimated entries and pending variances exist', async () => {
      const checkRes = await request(app.getHttpServer())
        .get(`/import-shipments/\${entities.shipmentId}/finalisation-check`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.OK);

      expect(checkRes.body.canFinalise).toBe(false);
      expect(checkRes.body.blockers.length).toBeGreaterThan(0);
    });

    it('should approve the variance', async () => {
      const varsRes = await request(app.getHttpServer())
        .get(`/shipments/\${entities.shipmentId}/variances`)
        .set('Authorization', `Bearer \${adminToken}`);

      const freightVar = varsRes.body.find(
        (v: any) => v.costCategoryCode === 'freight',
      );

      await request(app.getHttpServer())
        .post(`/variances/\${freightVar.id}/approve`)
        .set('Authorization', `Bearer \${adminToken}`)
        .send({ comment: 'Approved massive freight hike' })
        .expect(HttpStatus.CREATED);
    });

    it('should accept remaining estimated costs (BR05 exception)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/import-shipments/\${entities.shipmentId}/accept-estimates`)
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          justification:
            'No final invoices received, using estimates to unblock GRN',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.acceptedCount).toBe(3); // Duty, Insurance, Bank Charge
    });

    it('should successfully finalise the shipment', async () => {
      // Need confirmed GRN to finalize! BR06
      // Let's create a GRN and confirm it
      const grnCreate = await request(app.getHttpServer())
        .post('/goods-receipts')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          grnNumber: 'GRN-COST-123',
          receivedDate: '2026-07-05',
          receivedBy: 'Warehouse User',
          items: [
            {
              shipmentItemId: (
                await request(app.getHttpServer())
                  .get(`/import-shipments/\${entities.shipmentId}/items`)
                  .set('Authorization', `Bearer \${adminToken}`)
              ).body[0].id,
              receivedQuantity: 100,
            },
          ],
        });

      const grnId = grnCreate.body.id;

      await request(app.getHttpServer())
        .post(`/goods-receipts/\${grnId}/confirm`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);

      // Now finalise
      const res = await request(app.getHttpServer())
        .post(`/import-shipments/\${entities.shipmentId}/finalise`)
        .set('Authorization', `Bearer \${adminToken}`)
        .expect(HttpStatus.CREATED);

      expect(res.body.isFinalised).toBe(true);
    });
  });

  describe('3. Immutability Guard (409 Conflict)', () => {
    it('should reject adding a new cost entry to a finalised shipment', async () => {
      const res = await request(app.getHttpServer())
        .post('/cost-entries')
        .set('Authorization', `Bearer \${adminToken}`)
        .send({
          shipmentId: entities.shipmentId,
          costCategoryId: entities.categories['freight'],
          providerName: 'Late Vendor',
          invoiceNumber: 'INV-LATE',
          invoiceDate: '2026-08-01',
          amountForeign: 100,
          currency: 'USD',
          fxRate: 120.0,
          allocationMethod: 'by_value',
          isEstimated: false,
        });

      // Based on ImmutabilityGuard and CostEntriesService logic, it might return 400 or 409
      // ImmutabilityGuard checks req.body.shipmentId and throws 409 ConflictException
      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body.message).toContain('record is finalised');
    });
  });
});
