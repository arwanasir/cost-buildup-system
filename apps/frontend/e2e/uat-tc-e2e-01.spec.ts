import { test, expect } from '@playwright/test';

const uniq = Date.now().toString().slice(-5);
const SUPPLIER_NAME = `UAT Supplier ${uniq}`;
const PO_NUMBER = `PO-UAT-${uniq}`;
const LC_NUMBER = `LC-UAT-${uniq}`;
const SHIPMENT_NO = `SHP-UAT-${uniq}`;

test.describe('AC09: UAT E2E Tracing with 4DP assertions and Screenshots', () => {

  test.setTimeout(180000); // 3 minutes for full E2E flow

  test('Trace shipment from PO to final audited per-unit valuation', async ({ page }) => {
    // 1. Admin Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Create Supplier
    await page.goto('/suppliers/new');
    await page.fill('input[name="name"]', SUPPLIER_NAME);
    await page.fill('input[name="code"]', `SU-${uniq}`);
    await page.fill('input[name="taxId"]', `TAX-${uniq}`);
    await page.selectOption('select[name="currency"]', 'USD');
    await page.click('button[type="submit"]');
    await expect(page.locator('h1')).toContainText(SUPPLIER_NAME);

    // 3. Create PO
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
    await page.fill('input[name="items.0.unitPrice"]', '50.1234'); // 4dp input

    await page.click('button:has-text("Next Step")'); // Go to Estimates
    await page.click('button:has-text("Next Step")'); // Go to Review
    await page.click('button:has-text("Submit for Approval")');
    await page.click('button:has-text("Submit for Approval")'); // Confirm

    await expect(page.locator('h1')).toContainText(PO_NUMBER);

    // Screenshot 1: PO Review
    await page.screenshot({ path: 'test-results/screenshots/uat-step1-po.png', fullPage: true });

    // Approve PO
    await page.click('button:has-text("Approve PO")');

    // 4. Create LC
    await page.goto('/letters-of-credit/new');
    await page.fill('input[name="lcNumber"]', LC_NUMBER);
    await page.fill('input[name="amount"]', '5012.3400');
    await page.fill('input[name="currency"]', 'USD');
    await page.fill('input[name="issueDate"]', '2026-10-01');
    await page.fill('input[name="expiryDate"]', '2026-12-31');
    await page.click('button:has-text("Save Letter of Credit")');
    await expect(page.locator('h1')).toContainText(LC_NUMBER);

    // 5. Create Shipment (Supplier Invoice)
    await page.goto('/import-shipments/new');

    // Select PO using Combobox
    await page.waitForSelector('input[placeholder="Search..."]');
    await page.fill('input[placeholder="Search..."]', PO_NUMBER);
    await page.click(`li:has-text("${PO_NUMBER}")`);

    // Fill transit details
    await page.fill('input[name="vesselFlightName"]', 'E2E Vessel');
    await page.fill('input[name="blNumber"]', `BL-${uniq}`);
    await page.fill('input[name="portOfLoading"]', 'Shanghai');
    await page.fill('input[name="portOfDischarge"]', 'Alexandria');
    await page.fill('input[name="departureDate"]', '2026-10-05');
    await page.fill('input[name="expectedArrivalDate"]', '2026-11-05');

    await page.click('button:has-text("Next: Allocate Items")'); // Allocate Items

    await page.fill('input[name="items.0.shippedQuantity"]', '100');
    await page.fill('input[name="items.0.ciUnitPrice"]', '50.1234');

    await page.click('button:has-text("Next: Review & Submit")'); // Review
    await page.click('button:has-text("Submit Shipment Payload")');

    await expect(page.locator('h1')).toContainText('BL-');

    // Screenshot 2: Shipment Detail
    await page.screenshot({ path: 'test-results/screenshots/uat-step2-shipment.png', fullPage: true });

    // 6. Cost Buildup: Customs Duty Assessment
    await page.goto('/customs');
    await page.click(`tr:has-text("BL-${uniq}") >> button:has-text("Assess Duty")`);

    // Wait for the assess duty modal/page to load
    await page.waitForSelector('input[name="declarationNumber"]');
    await page.fill('input[name="declarationNumber"]', `DEC-${uniq}`);
    await page.fill('input[name="declarationDate"]', '2026-11-06');
    await page.fill('input[name="totalDutyEtb"]', '1500.5555');
    await page.fill('input[name="totalVatEtb"]', '300.1111');
    await page.fill('input[name="totalPenaltyEtb"]', '0.0000');

    await page.click('button:has-text("Save Assessment")');

    // 7. Assert 4DP everywhere in Landed Cost
    await page.goto('/import-shipments');
    await page.click(`text=BL-${uniq}`);
    await page.click('button:has-text("Landed Cost")');

    // Wait for the cost table
    await page.waitForSelector('table');

    // Check that we see the 4dp strings on the screen
    await expect(page.locator('table')).toContainText('1,500.5555'); // Duty
    await expect(page.locator('table')).toContainText('300.1111'); // VAT

    // Screenshot 3: Landed Cost displaying 4 DP
    await page.screenshot({ path: 'test-results/screenshots/uat-step3-landed-cost.png', fullPage: true });

    // 8. Customs Release and Finalisation
    await page.goto('/import-shipments');
    await page.click(`text=BL-${uniq}`);

    // Use the ChangeStatusButton for advancing status instead of select
    // It starts at 'ordered' implicitly? Or 'shipped' if departure date is past?
    // Let's just click 'Advance Status' until it gets to 'Cleared' or 'Customs Released'
    // Actually, customs assessment might automatically change status, or we can use the backend API
    // The easiest way is to loop clicking "Advance Status to"
    for (let i = 0; i < 3; i++) {
       const advanceBtn = page.locator('button:has-text("Advance Status to")');
       if (await advanceBtn.isVisible()) {
           await advanceBtn.click();
           await page.waitForTimeout(1000); // wait for refetch
       }
    }

    // We can just grab the shipmentId from URL
    const shipmentUrl = page.url();
    const shipmentId = shipmentUrl.split('/').pop();

    await page.goto(`/goods-receipts/new?shipmentId=${shipmentId}`);
    await page.waitForSelector('input[name="grnNumber"]');
    await page.fill('input[name="grnNumber"]', `GRN-${uniq}`);
    await page.fill('input[name="receivedDate"]', '2026-11-10');

    // Accept all items
    await page.locator('input[name="items.0.acceptedQuantity"]').fill('100');

    await page.click('button:has-text("Submit GRN")');
    await page.click('button:has-text("Submit GRN")'); // Confirm

    // Confirm GRN
    await page.click('button:has-text("Confirm GRN")');

    // Screenshot 4: GRN
    await page.screenshot({ path: 'test-results/screenshots/uat-step4-grn.png', fullPage: true });

    // Finalise Shipment
    await page.goto(`/import-shipments/${shipmentId}`);
    await page.click('button:has-text("Landed Cost")');
    await page.click('button:has-text("Sign & Finalise")');
    await page.click('button:has-text("Sign & Finalise")'); // Confirm

    await expect(page.locator('text=finalised')).toBeVisible();

    // 9. Audited Per-Unit Inventory Valuation (4dp)
    // We can go to the Item Detail page to check standard cost or report
    await page.goto('/reports');
    await page.click('button:has-text("Landed Cost by Item")');
    await page.waitForSelector('table');

    // Filter by shipment
    await page.fill('input[data-testid="filter-shipment-id"]', shipmentId || '');

    // Verify 4 decimal places in the valuation
    const tableText = await page.locator('table').innerText();

    // Check if the table text contains any 4dp pattern like ".XXXX"
    const has4Dp = /\.\d{4}/.test(tableText);
    expect(has4Dp).toBeTruthy();

    // Screenshot 5: Final Audited Valuation
    await page.screenshot({ path: 'test-results/screenshots/uat-step5-valuation.png', fullPage: true });
  });
});
