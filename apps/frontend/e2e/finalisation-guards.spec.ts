import { test, expect } from '@playwright/test';

const uniq = Date.now().toString().slice(-6);
const SUPPLIER_NAME = `Guard Supplier ${uniq}`;
const PO_NUMBER = `PO-G-${uniq}`;
const SHIPMENT_NUMBER = `SHP-G-${uniq}`;
const DEC_NUMBER = `DEC-G-${uniq}`;

test.describe('AC06, AC07, AC08: Finalisation Guards', () => {

  test.setTimeout(180000);

  test('Guards block GRN and Finalisation appropriately', async ({ page }) => {

    // 1. Admin logs in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Create Supplier
    await page.goto('/suppliers/new');
    await page.fill('input[name="name"]', SUPPLIER_NAME);
    await page.fill('input[name="code"]', `SG-${uniq}`);
    await page.selectOption('select[name="currency"]', 'USD');
    await page.click('button[type="submit"]');

    // Create PO with Estimates
    await page.goto('/purchase-orders');
    await page.click('button:has-text("Create PO")');
    await page.waitForSelector(`select[name="supplierId"]`);
    await page.selectOption('select[name="supplierId"]', { label: SUPPLIER_NAME });
    await page.fill('input[name="poNumber"]', PO_NUMBER);
    await page.fill('input[name="currency"]', 'USD');
    await page.fill('input[name="issueDate"]', '2026-10-01');
    await page.fill('input[name="expectedDeliveryDate"]', '2026-12-01');

    await page.click('button:has-text("Next Step")'); // Go to Items

    await page.click('button:has-text("Add Item")');
    await page.locator('select[name="items.0.itemId"]').selectOption({ index: 1 });
    await page.fill('input[name="items.0.quantity"]', '100');
    await page.fill('input[name="items.0.unitPrice"]', '50');

    await page.click('button:has-text("Next Step")'); // Go to Estimates

    // Fill Estimates
    await page.fill('input[name="estimatedFreightEtb"]', '1000');
    await page.fill('input[name="estimatedInsuranceEtb"]', '500');

    await page.click('button:has-text("Next Step")'); // Go to Review
    await page.click('button:has-text("Submit for Approval")');
    await page.click('button:has-text("Submit for Approval")'); // Confirm dialog
    await expect(page.locator('h1')).toContainText(PO_NUMBER);

    // Approve PO
    if (await page.locator('button:has-text("Approve PO")').isVisible()) {
        await page.click('button:has-text("Approve PO")');
        page.on('dialog', dialog => dialog.accept());
        await expect(page.locator('.bg-green-100').first()).toContainText('APPROVED');
    }

    // Create Shipment
    await page.goto('/import-shipments/new');
    await page.waitForSelector('input[placeholder="Search..."]');
    await page.fill('input[placeholder="Search..."]', PO_NUMBER);
    await page.click(`li:has-text("${PO_NUMBER}")`);

    await page.fill('input[name="vesselFlightName"]', 'E2E Vessel');
    await page.click('button:has-text("Next: Allocate Items")');
    await page.fill('input[name="items.0.shippedQuantity"]', '100');
    await page.fill('input[name="items.0.ciUnitPrice"]', '50');
    await page.click('button:has-text("Next: Review & Submit")');
    await page.click('button:has-text("Submit Shipment")');

    const shipmentUrl = page.url();
    const shipmentId = shipmentUrl.split('/').pop() || '';

    // 2. Inventory Mgr tries GRN -> blocks (AC06 for GRN)
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'inventory.mgr@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto('/goods-receipts/new');
    await page.waitForSelector(`select[name="shipmentId"] option:has-text("${SHIPMENT_NUMBER}")`);
    await page.selectOption('select[name="shipmentId"]', { label: SHIPMENT_NUMBER });
    await expect(page.locator('text=AC06: Customs Release Required')).toBeVisible();

    // 3. Admin does Customs Release
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto(`/import-shipments/${shipmentId}`);
    await page.click('a:has-text("Customs")');
    await page.click('button:has-text("Create Declaration")');
    await page.fill('input[name="declarationNumber"]', DEC_NUMBER);
    await page.fill('input[name="declarationDate"]', '2026-10-15');
    await page.click('button:has-text("Submit Declaration")');

    await page.click('button:has-text("Assess Duty")');
    await page.click('button:has-text("Confirm Assessment")');
    await page.click('button:has-text("Record Payment")');
    await page.fill('input[name="paymentReference"]', `PAY-${uniq}`);
    await page.click('button:has-text("Confirm Payment")');
    await page.click('button:has-text("Request Release")');
    await page.fill('textarea[name="releaseNotes"]', 'All duties paid');
    await page.click('button:has-text("Confirm Release")');

    // 4. Admin navigates to Landed Cost tab -> sees BR05 blocker
    await page.click('a:has-text("Landed Cost")');
    await expect(page.locator('text=BR05: Cannot finalize with estimated costs')).toBeVisible();

    // 5. Admin goes to Costs. Marks Freight estimate as actual = 1200.
    await page.click('a:has-text("Costs")');
    // Find the row for Freight (1000 ETB)
    await page.locator('tr:has-text("1,000.00")').locator('button[title="Mark as Actual"]').click();
    await page.waitForSelector('input[name="invoiceNumber"]');
    await page.fill('input[name="invoiceNumber"]', `ACT-${uniq}`);
    await page.fill('input[name="amountForeign"]', '1200'); // Causes variance
    await page.fill('input[name="fxRate"]', '1');
    await page.click('button:has-text("Confirm Actual")');
    await page.waitForTimeout(500);

    // 6. Admin navigates to Landed Cost tab -> sees BR05 AND BR07
    await page.click('a:has-text("Landed Cost")');
    await expect(page.locator('text=BR05: Cannot finalize with estimated costs')).toBeVisible(); // For insurance
    await expect(page.locator('text=BR07: Found 1 pending cost variance')).toBeVisible(); // For freight

    // 7. Finance Mgr logs in
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'finance.mgr@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 8. Finance Mgr "Accept Estimates"
    await page.goto(`/import-shipments/${shipmentId}/landed-cost`);
    await page.click('button:has-text("Accept Estimates")');
    await page.waitForSelector('input[placeholder*="Justification"]');
    await page.fill('input[placeholder*="Justification"]', 'E2E Accepted for audit trail');
    await page.click('button:has-text("Override & Accept")');

    // Ensure BR05 is gone
    await expect(page.locator('text=BR05: Cannot finalize with estimated costs')).toBeHidden();

    // 9. Finance Mgr approves Variance
    await page.goto('/variance');
    await page.locator('button:has-text("Approve")').first().click();
    await page.waitForSelector('textarea[name="comments"]');
    await page.fill('textarea[name="comments"]', 'E2E Variance Approved');
    await page.click('button:has-text("Confirm Approval")');

    // 10. Check Landed Cost -> sees "No confirmed GRN"
    await page.goto(`/import-shipments/${shipmentId}/landed-cost`);
    await expect(page.locator('text=BR07')).toBeHidden();
    await expect(page.locator('text=No confirmed Goods Receiving Note')).toBeVisible();

    // 11. Inventory Mgr logs in & does GRN
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'inventory.mgr@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto('/goods-receipts/new');
    await page.selectOption('select[name="shipmentId"]', { label: SHIPMENT_NUMBER });
    await page.fill('input[name="grnNumber"]', `GRN-G-${uniq}`);
    await page.fill('input[name="receiptDate"]', '2026-10-25');
    await page.click('button:has-text("Create GRN")');

    await page.click('button:has-text("Inspect & Accept")');
    await page.waitForSelector('input[name="lines.0.acceptedQty"]');
    await page.fill('input[name="lines.0.acceptedQty"]', '100');
    await page.fill('input[name="lines.0.rejectedQty"]', '0');
    await page.selectOption('select[name="lines.0.status"]', 'accepted');
    await page.click('button:has-text("Save Inspection")');

    await page.click('button:has-text("Post to Inventory")');
    page.on('dialog', dialog => dialog.accept());
    await expect(page.locator('.bg-green-100')).toContainText('POSTED');

    // 12. Admin finalises
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto(`/import-shipments/${shipmentId}/landed-cost`);
    await page.click('button:has-text("Compute Now")');

    // Now it should be clear for finalisation
    await expect(page.locator('text=Clear for Finalisation')).toBeVisible();
    await page.click('button:has-text("Finalise Shipment")');
    await page.waitForSelector('button:has-text("Sign & Finalise")');
    await page.click('button:has-text("Sign & Finalise")');

    // Check status badge
    await expect(page.locator('.bg-purple-100').first()).toContainText('FINALISED');
  });
});
