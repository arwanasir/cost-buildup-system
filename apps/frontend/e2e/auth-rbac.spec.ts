import { test, expect } from '@playwright/test';

const USERS = [
  { role: 'system_admin', email: 'admin@company.com', pass: 'Password123!', expected: 'Dashboard' },
  { role: 'warehouse_manager', email: 'inventory.mgr@company.com', pass: 'Password123!', expected: 'Goods Receipts' },
  { role: 'finance_officer', email: 'finance.officer@company.com', pass: 'Password123!', expected: 'Letters of Credit' },
  { role: 'finance_manager', email: 'finance.mgr@company.com', pass: 'Password123!', expected: 'Variance' },
  { role: 'procurement_officer', email: 'importer@company.com', pass: 'Password123!', expected: 'Purchase Orders' },
  { role: 'procurement_manager', email: 'procurement.mgr@company.com', pass: 'Password123!', expected: 'Purchase Orders' },
  { role: 'customs_officer', email: 'customs@company.com', pass: 'Password123!', expected: 'Customs' },
  { role: 'general_manager', email: 'auditor@company.com', pass: 'Password123!', expected: 'Audit Logs' },
];

test.describe('RBAC Authorization', () => {

  for (const user of USERS) {
    test(`Role ${user.role} can login and see appropriate sidebar links`, async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.pass);
      await page.click('button[type="submit"]');

      // Wait for navigation
      await expect(page).toHaveURL('/');

      // Wait for sidebar to load
      await page.waitForSelector('nav a');
      const text = await page.locator('nav').innerText();
      expect(text).toContain(user.expected);
    });
  }

  test('warehouse_manager is blocked from direct URL access to LC and cost entries', async ({ page }) => {
    const user = USERS.find(u => u.role === 'warehouse_manager')!;
    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.pass);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Try LC
    await page.goto('/letters-of-credit');
    // It should redirect to root due to ProtectedRoute
    await expect(page).toHaveURL('/');

    // Try Cost entries
    await page.goto('/import-shipments/00000000-0000-0000-0000-000000000000/costs');
    await expect(page).toHaveURL('/');
  });

  test('finance_officer cannot approve own entry (Maker-Checker AC10)', async ({ request }) => {
    // 1. Login as finance_officer
    const loginRes = await request.post('/api/auth/login', {
      data: {
        email: 'finance.officer@company.com',
        password: 'Password123!'
      }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { accessToken } = await loginRes.json();

    // 2. We need an entry to approve. Because the DB was reset and seeded, we have some entries.
    // Let's create an entry directly via API so we know we are the maker.

    // First, find a shipment ID
    const shipmentsRes = await request.get('/api/import-shipments', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const shipments = await shipmentsRes.json();
    const shipmentId = shipments.data[0].id;

    // Get a category
    const catsRes = await request.get('/api/cost-categories', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const cats = await catsRes.json();
    const catId = cats.data[0].id;

    // Create entry
    const createRes = await request.post(`/api/import-shipments/${shipmentId}/cost-entries`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        costCategoryId: catId,
        providerName: 'Test Provider',
        invoiceNumber: 'INV-TEST',
        invoiceDate: '2026-10-01',
        amountForeign: 100,
        currency: 'USD',
        fxRate: 1,
        isEstimated: true,
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const entry = await createRes.json();

    // 3. Try to mark it as actual
    const approveRes = await request.post(`/api/cost-entries/${entry.id}/mark-actual`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        amountForeign: 100,
        fxRate: 1
      }
    });

    // Should be Forbidden because of Maker-Checker
    expect(approveRes.status()).toBe(403);
    const errorBody = await approveRes.json();
    expect(errorBody.message).toContain('Maker-Checker rule');
  });

});
