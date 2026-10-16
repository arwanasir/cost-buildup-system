import { test, expect } from '@playwright/test';

const uniq = Date.now().toString().slice(-6);
const SUPPLIER_NAME = `E2E Supplier ${uniq}`;
const PO_NUMBER = `PO-${uniq}`;
const LC_NUMBER = `LC-${uniq}`;
const SHIPMENT_NUMBER = `SHP-${uniq}`;
const CI_NUMBER = `CI-${uniq}`;
const DEC_NUMBER = `DEC-${uniq}`;

test.describe('AC01: Full Import Cycle', () => {

  // Give the full cycle test plenty of time
  test.setTimeout(180000);

  test('Complete import flow from supplier to inventory lineage', async ({ page, request, context }) => {

    // 1. Login as system admin to perform most actions
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Create Supplier
    await page.goto('/suppliers/new');
    await page.fill('input[name="name"]', SUPPLIER_NAME);
    await page.fill('input[name="code"]', `S-${uniq}`);
    await page.fill('input[name="taxId"]', `TAX-${uniq}`);
    await page.selectOption('select[name="currency"]', 'USD');
    await page.selectOption('select[name="paymentTerms"]', 'NET_30');
    await page.click('button[type="submit"]');

    await expect(page.locator('h1')).toContainText(SUPPLIER_NAME);

    // 3. Create PO
    await page.goto('/purchase-orders');
    await page.click('button:has-text("Create PO")');
    // The select box for supplier might be populated asynchronously, wait for it
    await page.waitForSelector(`select[name="supplierId"]`);
    await page.selectOption('select[name="supplierId"]', { label: SUPPLIER_NAME });
    await page.fill('input[name="poNumber"]', PO_NUMBER);
    await page.fill('input[name="currency"]', 'USD');

    await page.fill('input[name="issueDate"]', '2026-10-01');
    await page.fill('input[name="expectedDeliveryDate"]', '2026-12-01');

    await page.click('button:has-text("Next Step")'); // Items
    await page.click('button:has-text("Add Item")');
    // Using nth for form arrays
    await page.locator('select[name="items.0.itemId"]').selectOption({ index: 1 });
    await page.fill('input[name="items.0.quantity"]', '100');
    await page.fill('input[name="items.0.unitPrice"]', '50');

    await page.click('button:has-text("Next Step")'); // Estimates
    await page.click('button:has-text("Next Step")'); // Review
    await page.click('button:has-text("Submit for Approval")');
    await page.click('button:has-text("Submit for Approval")'); // Dialog confirm

    await expect(page.locator('h1')).toContainText(PO_NUMBER);

    // 4. Approve PO
    // Go to PO detail (we are already there after creation redirect)
    if (await page.locator('button:has-text("Approve PO")').isVisible()) {
        await page.click('button:has-text("Approve PO")');
        // Accept window confirm if any
        page.on('dialog', dialog => dialog.accept());
        await expect(page.locator('.bg-green-100').first()).toContainText('APPROVED');
    }

    // 5. Create LC
    await page.goto('/letters-of-credit/new');
    await page.fill('input[name="lcNumber"]', LC_NUMBER);
    await page.fill('input[name="applicantName"]', 'E2E Company Ltd');
    await page.waitForSelector(`select[name="supplierId"] option:has-text("${SUPPLIER_NAME}")`);
    await page.selectOption('select[name="supplierId"]', { label: SUPPLIER_NAME });

    // Check the PO checkbox
    await page.locator(`input[type="checkbox"]`).first().check();

    await page.fill('input[name="issuingBank"]', 'Test Bank');
    await page.selectOption('select[name="lcType"]', 'sight');
    await page.fill('input[name="currency"]', 'USD');
    await page.fill('input[name="fxRate"]', '1');
    await page.fill('input[name="amountForeign"]', '5000');
    await page.fill('input[name="expiryDate"]', '2026-12-31');

    await page.click('button:has-text("Create Letter of Credit")');
    await expect(page.locator('h1')).toContainText(LC_NUMBER);

    // 6. Create Shipment
    await page.goto('/import-shipments/new');

    // Step 1: Header & Sourcing
    // Wait for combobox to load
    await page.waitForSelector('input[placeholder="Search..."]');
    // For PO Combobox, we type the PO number then click the option
    await page.fill('input[placeholder="Search..."]', PO_NUMBER);
    await page.click(`li:has-text("${PO_NUMBER}")`);

    // Fill transit details
    await page.fill('input[name="vesselFlightName"]', 'E2E Vessel');
    await page.fill('input[name="blNumber"]', `BL-${uniq}`);
    await page.fill('input[name="portOfLoading"]', 'Shanghai');
    await page.fill('input[name="portOfDischarge"]', 'Alexandria');
    await page.fill('input[name="departureDate"]', '2026-10-10');
    await page.fill('input[name="expectedArrivalDate"]', '2026-10-30');

    // Go to next step
    await page.click('button:has-text("Next: Allocate Items")');

    // Step 2: Items
    await page.fill('input[name="items.0.shippedQuantity"]', '100');
    await page.fill('input[name="items.0.ciUnitPrice"]', '50');

    await page.click('button:has-text("Next: Review & Submit")');

    // Step 3: Review
    await page.click('button:has-text("Submit Shipment")');
    await expect(page.locator('h1')).toContainText('SHP');

    // Extract Shipment ID from URL
    const shipmentUrl = page.url();
    const shipmentId = shipmentUrl.split('/').pop() || '';

    // Add Commercial Invoice
    await page.click('a:has-text("Commercial Invoice")');
    await page.fill('input[name="invoiceNumber"]', CI_NUMBER);
    await page.fill('input[name="invoiceDate"]', '2026-10-12');
    await page.click('button:has-text("Save Commercial Invoice")');
    await expect(page.locator('.bg-amber-50')).toBeVisible(); // Variance alert or confirmation

    // 7. Customs Assessment & Payment
    await page.click('a:has-text("Customs")');
    await page.click('button:has-text("Create Declaration")');

    await page.fill('input[name="declarationNumber"]', DEC_NUMBER);
    await page.fill('input[name="declarationDate"]', '2026-10-15');
    await page.click('button:has-text("Submit Declaration")');
    await expect(page.locator('h1')).toContainText(DEC_NUMBER);

    // Assess Duty
    await page.click('button:has-text("Assess Duty")');
    await page.click('button:has-text("Confirm Assessment")');
    await expect(page.locator('text=ASSESSED')).toBeVisible();

    // Pay Duties
    await page.click('button:has-text("Record Payment")');
    await page.fill('input[name="paymentReference"]', `PAY-${uniq}`);
    await page.fill('input[name="receiptNumber"]', `REC-${uniq}`);
    await page.click('button:has-text("Confirm Payment")');

    // Request Release
    await page.click('button:has-text("Request Release")');
    await page.fill('textarea[name="releaseNotes"]', 'All duties paid');
    await page.click('button:has-text("Confirm Release")');
    await expect(page.locator('.bg-green-100')).toContainText('RELEASED');

    // 8. Cost Entries & Allocations
    await page.goto(`/import-shipments/${shipmentId}/costs`);

    // Helper function to add a cost entry
    const addCostEntry = async (categoryIndex: number, amount: string, allocMethod: string) => {
        await page.click('button:has-text("Add Cost")');
        // Wait for modal
        await page.waitForSelector('select[name="costCategoryId"]');
        await page.locator('select[name="costCategoryId"]').selectOption({ index: categoryIndex });
        await page.fill('input[name="providerName"]', 'E2E Provider');
        await page.fill('input[name="invoiceNumber"]', `INV-${categoryIndex}-${uniq}`);
        await page.fill('input[name="invoiceDate"]', '2026-10-20');
        await page.fill('input[name="amountForeign"]', amount);
        await page.selectOption('select[name="currency"]', 'USD');
        await page.fill('input[name="fxRate"]', '1');
        await page.selectOption('select[name="allocationMethod"]', allocMethod);

        await page.click('button:has-text("Save Cost Entry")');
        // Wait for it to appear
        await expect(page.locator('table')).toContainText(`INV-${categoryIndex}-${uniq}`);
    };

    // We add 4 cost entries using the 4 methods
    await addCostEntry(1, '1000', 'value');
    await addCostEntry(2, '500', 'weight');
    await addCostEntry(3, '200', 'volume');
    await addCostEntry(4, '100', 'manual');

    // Manual Allocation Step
    await page.click('button:has-text("Allocate")');
    await page.waitForSelector('input[name="allocations.0.amount"]');
    await page.fill('input[name="allocations.0.amount"]', '100');
    await page.click('button:has-text("Save Allocations")');
    await expect(page.locator('text=Allocations saved')).toBeVisible();

    // 9. Maker-Checker Mark Actual (We created them as admin)
    // We must logout and login as a checker
    await page.goto('/');
    await page.click('text=Sign out');

    await page.fill('input[type="email"]', 'finance.mgr@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.goto(`/import-shipments/${shipmentId}/costs`);

    // Approve the first one
    await page.locator('button[title="Mark as Actual"]').first().click();
    await page.waitForSelector('input[name="invoiceNumber"]');
    await page.fill('input[name="invoiceNumber"]', `ACTUAL-${uniq}`);
    await page.fill('input[name="amountForeign"]', '1100'); // Different to cause a variance!
    await page.fill('input[name="fxRate"]', '1');
    await page.click('button:has-text("Confirm Actual")');
    await page.waitForTimeout(500);

    // 10. Variance Approval
    await page.goto('/variance');
    // Find the variance row and approve
    await page.locator('button:has-text("Approve")').first().click();
    await page.waitForSelector('textarea[name="comments"]');
    await page.fill('textarea[name="comments"]', 'E2E Approved');
    await page.click('button:has-text("Confirm Approval")');
    await page.waitForTimeout(500);

    // 11. GRN with Inspection
    // Login as warehouse manager
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'inventory.mgr@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto('/goods-receipts/new');
    await page.waitForSelector(`select[name="shipmentId"] option:has-text("${SHIPMENT_NUMBER}")`);
    await page.selectOption('select[name="shipmentId"]', { label: SHIPMENT_NUMBER });
    await page.fill('input[name="grnNumber"]', `GRN-${uniq}`);
    await page.fill('input[name="receiptDate"]', '2026-10-25');
    await page.click('button:has-text("Create GRN")');
    await expect(page.locator('h1')).toContainText(`GRN-${uniq}`);

    // Inspection
    await page.click('button:has-text("Inspect & Accept")');
    await page.waitForSelector('input[name="lines.0.acceptedQty"]');
    await page.fill('input[name="lines.0.acceptedQty"]', '100');
    await page.fill('input[name="lines.0.rejectedQty"]', '0');
    await page.selectOption('select[name="lines.0.status"]', 'accepted');
    await page.click('button:has-text("Save Inspection")');
    await expect(page.locator('text=Inspection saved')).toBeVisible();

    // Post to Inventory
    await page.click('button:has-text("Post to Inventory")');
    page.on('dialog', dialog => dialog.accept());
    await expect(page.locator('.bg-green-100')).toContainText('POSTED');

    // 12. Finalise Shipment & Compute
    await page.goto('/');
    await page.click('text=Sign out');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto(`/import-shipments/${shipmentId}`);

    // We must compute landed cost first
    await page.click('a:has-text("Landed Cost")');
    await page.click('button:has-text("Compute Now")');
    // Ensure base cost exists
    await expect(page.locator('table')).toContainText('100.00');

    // Finalise
    await page.goto(`/import-shipments/${shipmentId}`);
    await page.click('button:has-text("Finalise Shipment")');
    await page.waitForSelector('button:has-text("Sign & Finalise")');
    await page.click('button:has-text("Sign & Finalise")');
    await expect(page.locator('.bg-purple-100').first()).toContainText('FINALISED');

    // 13. Assert Lineage
    await page.goto(`/import-shipments/${shipmentId}/landed-cost`);
    await page.click('button:has-text("View Lineage")');
    await expect(page.locator('h3')).toContainText('Landed Cost Composition');
    // Ensure the modal opened
    await expect(page.locator('.fixed.inset-y-0.right-0')).toBeVisible();
  });
});
