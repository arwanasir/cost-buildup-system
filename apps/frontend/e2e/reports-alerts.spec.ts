import { test, expect } from '@playwright/test';

const uniq = Date.now().toString().slice(-6);

test.describe('AC11 & AC14: Reports and Alerts', () => {

  test.setTimeout(120000);

  test('AC11: Nine reports load, filter, and export', async ({ page }) => {
    // 1. Admin logs in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Go to Reports
    await page.goto('/reports');

    // 3. Verify all 9 reports are listed in the sidebar
    const expectedReports = [
      'Landed Cost by Shipment',
      'Landed Cost by Item',
      'Landed Cost by Supplier',
      'Import Cost Summary',
      'Letter of Credit Status',
      'Customs Duty Analysis',
      'Shipment Status Matrix',
      'Cost Variance Analytics',
      'Supplier Performance'
    ];

    for (const report of expectedReports) {
      await expect(page.locator(`button:has-text("${report}")`)).toBeVisible();
    }

    // 4. Test Filtering on one report
    await page.click(`button:has-text("Landed Cost by Shipment")`);
    // Wait for table to load
    await page.waitForSelector('table');

    // Fill dates
    await page.fill('input[data-testid="filter-start-date"]', '2026-01-01');
    await page.fill('input[data-testid="filter-end-date"]', '2026-12-31');
    // We should still see the table
    await expect(page.locator('table')).toBeVisible();

    // 5. Test Export to Excel
    const downloadExcelPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export to Excel")');
    const downloadExcel = await downloadExcelPromise;
    expect(downloadExcel.suggestedFilename()).toContain('.xlsx');

    // Test Export to PDF
    const downloadPdfPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export to PDF")');
    const downloadPdf = await downloadPdfPromise;
    expect(downloadPdf.suggestedFilename()).toContain('.pdf');

    // Iterate through all other reports and ensure the table loads
    for (const report of expectedReports) {
      await page.click(`button:has-text("${report}")`);
      await page.waitForSelector('table');
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('AC14: LC Alert Scheduler produces UI notification and Mailpit email', async ({ page, request }) => {
    // 1. Admin logs in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Create an LC that expires in 7 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const expiryDate = futureDate.toISOString().split('T')[0];
    const lcNumber = `LC-ALERT-${uniq}`;

    await page.goto('/letters-of-credit/new');
    await page.fill('input[name="lcNumber"]', lcNumber);
    await page.fill('input[name="amount"]', '50000');
    await page.fill('input[name="currency"]', 'USD');
    await page.fill('input[name="issueDate"]', '2026-10-01');
    await page.fill('input[name="expiryDate"]', expiryDate);
    await page.click('button:has-text("Save Letter of Credit")');
    await expect(page.locator(`text=${lcNumber}`)).toBeVisible();

    // 3. Trigger Scheduler manually via API
    // Wait for the token to be available in localStorage
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000/api/v1';

    const response = await request.post(`${apiUrl}/letters-of-credit/alerts/run`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(response.ok()).toBeTruthy();

    // 4. Check Bell Notification in UI
    await page.reload();
    // The notification bell shows a red badge with the count
    await expect(page.locator('button.relative svg + span.bg-red-600')).toBeVisible();

    // 5. Check Mailpit for the email
    const mailpitUrl = process.env.MAILPIT_URL || 'http://localhost:8025';
    const mailpitResponse = await request.get(`${mailpitUrl}/api/v1/messages`);
    expect(mailpitResponse.ok()).toBeTruthy();

    const mailData = await mailpitResponse.json();
    const emailStr = JSON.stringify(mailData);

    // The email body or subject should contain the LC number and it's an expiry alert
    expect(emailStr).toContain(lcNumber);
  });
});
