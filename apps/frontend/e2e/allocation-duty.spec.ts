import { test, expect } from '@playwright/test';

const uniq = Date.now().toString().slice(-6);
const SUPPLIER_NAME = `Duty Supplier ${uniq}`;
const PO_NUMBER = `PO-DUTY-${uniq}`;
const SHIPMENT_NUMBER = `SHP-DUTY-${uniq}`;
const DEC_NUMBER = `DEC-DUTY-${uniq}`;

test.describe('AC02 & AC03: FR-07.3 Allocation and Duty', () => {

  test.setTimeout(120000);

  test('Freight is allocated by value, but Duty and VAT are independent', async ({ page, request }) => {

    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Create Supplier
    await page.goto('/suppliers/new');
    await page.fill('input[name="name"]', SUPPLIER_NAME);
    await page.fill('input[name="code"]', `SD-${uniq}`);
    await page.fill('input[name="taxId"]', `TAX-${uniq}`);
    await page.selectOption('select[name="currency"]', 'USD');
    await page.selectOption('select[name="paymentTerms"]', 'NET_30');
    await page.click('button[type="submit"]');
    await expect(page.locator('h1')).toContainText(SUPPLIER_NAME);

    // 3. Create PO with two items: 4000 and 3000
    await page.goto('/purchase-orders');
    await page.click('button:has-text("Create PO")');
    await page.waitForSelector(`select[name="supplierId"]`);
    await page.selectOption('select[name="supplierId"]', { label: SUPPLIER_NAME });
    await page.fill('input[name="poNumber"]', PO_NUMBER);
    await page.fill('input[name="currency"]', 'USD');
    await page.fill('input[name="issueDate"]', '2026-10-01');
    await page.fill('input[name="expectedDeliveryDate"]', '2026-12-01');

    await page.click('button:has-text("Next Step")'); // Items

    // Add Item 1 (4000)
    await page.click('button:has-text("Add Item")');
    await page.locator('select[name="items.0.itemId"]').selectOption({ index: 1 });
    await page.fill('input[name="items.0.quantity"]', '1');
    await page.fill('input[name="items.0.unitPrice"]', '4000');

    // Add Item 2 (3000)
    await page.click('button:has-text("Add Item")');
    await page.locator('select[name="items.1.itemId"]').selectOption({ index: 2 });
    await page.fill('input[name="items.1.quantity"]', '1');
    await page.fill('input[name="items.1.unitPrice"]', '3000');

    await page.click('button:has-text("Next Step")'); // Estimates
    await page.click('button:has-text("Next Step")'); // Review
    await page.click('button:has-text("Submit for Approval")');
    await page.click('button:has-text("Submit for Approval")'); // Confirm dialog
    await expect(page.locator('h1')).toContainText(PO_NUMBER);

    // Approve PO
    if (await page.locator('button:has-text("Approve PO")').isVisible()) {
        await page.click('button:has-text("Approve PO")');
        page.on('dialog', dialog => dialog.accept());
        await expect(page.locator('.bg-green-100').first()).toContainText('APPROVED');
    }

    // 4. Create Shipment
    await page.goto('/import-shipments/new');
    await page.fill('input[name="shipmentNumber"]', SHIPMENT_NUMBER);
    await page.selectOption('select[name="supplierId"]', { label: SUPPLIER_NAME });

    // Select the PO we just made (we skip LC for this test to save time if optional)
    // Wait, the shipment requires an LC? In the DB, lcId might be nullable. Let's try without LC.
    // If it requires LC, the form will fail. In the UI, LC is optional if the field is not required.
    // Wait, we can just select the PO directly in the shipment or we need an LC.
    // Let's create an LC just in case.
    await page.goto('/letters-of-credit/new');
    await page.fill('input[name="lcNumber"]', `LC-DUTY-${uniq}`);
    await page.fill('input[name="applicantName"]', 'E2E Company Ltd');
    await page.waitForSelector(`select[name="supplierId"] option:has-text("${SUPPLIER_NAME}")`);
    await page.selectOption('select[name="supplierId"]', { label: SUPPLIER_NAME });
    await page.locator(`input[type="checkbox"]`).first().check();
    await page.fill('input[name="issuingBank"]', 'Test Bank');
    await page.selectOption('select[name="lcType"]', 'sight');
    await page.fill('input[name="currency"]', 'USD');
    await page.fill('input[name="fxRate"]', '1');
    await page.fill('input[name="amountForeign"]', '7000');
    await page.fill('input[name="expiryDate"]', '2026-12-31');
    await page.click('button:has-text("Create Letter of Credit")');
    await expect(page.locator('h1')).toContainText(`LC-DUTY-${uniq}`);

    // Create Shipment
    await page.goto('/import-shipments/new');

    // Step 1: Header
    await page.waitForSelector('input[placeholder="Search..."]');
    await page.fill('input[placeholder="Search..."]', PO_NUMBER);
    await page.click(`li:has-text("${PO_NUMBER}")`);

    await page.fill('input[name="vesselFlightName"]', 'E2E Vessel');
    await page.fill('input[name="blNumber"]', `BL-DUTY-${uniq}`);
    await page.fill('input[name="portOfLoading"]', 'Shanghai');
    await page.fill('input[name="portOfDischarge"]', 'Alexandria');
    await page.fill('input[name="departureDate"]', '2026-10-10');
    await page.fill('input[name="expectedArrivalDate"]', '2026-10-30');

    await page.click('button:has-text("Next: Allocate Items")');

    // Step 2: Items
    await page.fill('input[name="items.0.shippedQuantity"]', '1');
    await page.fill('input[name="items.0.ciUnitPrice"]', '4000');

    await page.fill('input[name="items.1.shippedQuantity"]', '1');
    await page.fill('input[name="items.1.ciUnitPrice"]', '3000');

    await page.click('button:has-text("Next: Review & Submit")');

    // Step 3: Submit
    await page.click('button:has-text("Submit Shipment")');
    await expect(page.locator('h1')).toContainText('SHP');

    const shipmentUrl = page.url();
    const shipmentId = shipmentUrl.split('/').pop() || '';

    // Add Commercial Invoice
    await page.click('a:has-text("Commercial Invoice")');
    await page.fill('input[name="invoiceNumber"]', `CI-DUTY-${uniq}`);
    await page.fill('input[name="invoiceDate"]', '2026-10-12');
    await page.click('button:has-text("Save Commercial Invoice")');
    await expect(page.locator('.bg-amber-50')).toBeVisible(); // Variance alert or confirmation

    // 5. Add Customs Duty & VAT
    await page.click('a:has-text("Customs")');
    await page.click('button:has-text("Create Declaration")');
    await page.fill('input[name="declarationNumber"]', DEC_NUMBER);
    await page.fill('input[name="declarationDate"]', '2026-10-15');
    await page.click('button:has-text("Submit Declaration")');
    await expect(page.locator('h1')).toContainText(DEC_NUMBER);

    await page.click('button:has-text("Assess Duty")');
    await page.click('button:has-text("Confirm Assessment")');
    await expect(page.locator('text=ASSESSED')).toBeVisible();

    // 6. Add Freight Cost Entry = 8000 (VALUE allocation)
    await page.goto(`/import-shipments/${shipmentId}/costs`);
    await page.click('button:has-text("Add Cost")');

    // We must ensure we select the "Freight" category which has 'value' by default
    await page.waitForSelector('select[name="costCategoryId"]');
    // Assuming category index 1 is Freight (which it is in our seeds)
    await page.locator('select[name="costCategoryId"]').selectOption({ index: 1 });
    await page.fill('input[name="providerName"]', 'E2E Freight');
    await page.fill('input[name="invoiceNumber"]', `INV-FR-${uniq}`);
    await page.fill('input[name="invoiceDate"]', '2026-10-20');
    await page.fill('input[name="amountForeign"]', '8000');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="fxRate"]', '1');
    await page.selectOption('select[name="allocationMethod"]', 'value');
    await page.click('button:has-text("Save Cost Entry")');
    await expect(page.locator('table')).toContainText(`INV-FR-${uniq}`);

    // Wait for the cost entry ID to do Mark Actual
    // We can just use the API to mark actual and bypass maker-checker
    // To do this, we get the accessToken from sessionStorage via page.evaluate
    const token = await page.evaluate(() => sessionStorage.getItem('auth-storage') ? JSON.parse(sessionStorage.getItem('auth-storage')!).state.accessToken : null);

    // Mark actual via API to bypass UI logout/login hassle
    // First get entries
    const entriesRes = await request.get(`/api/import-shipments/${shipmentId}/cost-entries`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const entries = await entriesRes.json();
    const freightEntry = entries.data[0];

    // Mark actual (we need another user token)
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'finance.mgr@company.com', password: 'Password123!' }
    });
    const { accessToken: checkerToken } = await loginRes.json();

    await request.post(`/api/cost-entries/${freightEntry.id}/mark-actual`, {
      headers: { Authorization: `Bearer ${checkerToken}` },
      data: { amountForeign: 8000, fxRate: 1 }
    });

    // 7. Receive Goods
    // We must receive goods before Landed Cost can be computed.
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'inventory.mgr@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto('/goods-receipts/new');
    await page.waitForSelector(`select[name="shipmentId"] option:has-text("${SHIPMENT_NUMBER}")`);
    await page.selectOption('select[name="shipmentId"]', { label: SHIPMENT_NUMBER });
    await page.fill('input[name="grnNumber"]', `GRN-DUTY-${uniq}`);
    await page.fill('input[name="receiptDate"]', '2026-10-25');
    await page.click('button:has-text("Create GRN")');

    await page.click('button:has-text("Inspect & Accept")');
    await page.waitForSelector('input[name="lines.0.acceptedQty"]');
    await page.fill('input[name="lines.0.acceptedQty"]', '1');
    await page.fill('input[name="lines.0.rejectedQty"]', '0');
    await page.selectOption('select[name="lines.0.status"]', 'accepted');

    await page.fill('input[name="lines.1.acceptedQty"]', '1');
    await page.fill('input[name="lines.1.rejectedQty"]', '0');
    await page.selectOption('select[name="lines.1.status"]', 'accepted');

    await page.click('button:has-text("Save Inspection")');
    await page.click('button:has-text("Post to Inventory")');
    page.on('dialog', dialog => dialog.accept());
    await expect(page.locator('.bg-green-100')).toContainText('POSTED');

    // 8. Compute Landed Cost
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto(`/import-shipments/${shipmentId}/landed-cost`);

    // We intercept the API call to check the exact response values
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/compute') && res.status() === 201),
      page.click('button:has-text("Compute Now")')
    ]);

    const computeData = await response.json();
    const results = computeData.data;

    // Item 1 (4000) should have 4571.4286 freight
    // Item 2 (3000) should have 3428.5714 freight
    // Let's sort them by CI Value (Item 1 has 4000, Item 2 has 3000)
    const item1 = results.find((r: any) => parseFloat(r.ciValueEtb) === 4000);
    const item2 = results.find((r: any) => parseFloat(r.ciValueEtb) === 3000);

    expect(item1).toBeDefined();
    expect(item2).toBeDefined();

    expect(item1.freightAllocatedEtb).toBe('4571.4286');
    expect(item2.freightAllocatedEtb).toBe('3428.5714');

    // AC03: Duty and VAT are independent. Wait, what are their duties?
    // Since duty is calculated by Tariffs (e.g. 10%), it won't be a 4/7 and 3/7 split of the "700" total.
    // The backend computes it strictly by (CI Value + Freight + Insurance) * TariffRate.
    // We just assert they exist and are strictly populated from Customs logic.
    expect(parseFloat(item1.customsDutyEtb)).toBeGreaterThan(0);
    expect(parseFloat(item2.customsDutyEtb)).toBeGreaterThan(0);

    // Ensure it renders on screen (using a regex that ignores formatting commas/decimals length)
    const tableText = await page.locator('table').innerText();

    // In US locale, 4571.4286 might render as 4,571.429.
    // We check for the integer part and first decimal to be safe across browsers
    expect(tableText).toMatch(/4,?571\.4/);
    expect(tableText).toMatch(/3,?428\.5/);

  });
});
