import { test, expect } from '@playwright/test';

test.describe('I18n and Responsive Layout', () => {

  test('switch to Amharic without logout and confirm labels change', async ({ page }) => {
    // 1. Admin logs in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Assert English text is visible
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();

    // 3. Switch language to Amharic
    await page.locator('header select').selectOption({ value: 'am' });

    // 4. Assert Amharic text is visible without reloading or logging out
    await expect(page.locator('button:has-text("ውጣ")')).toBeVisible();
    await expect(page.locator('button:has-text("Logout")')).not.toBeVisible();

    // Switch back to English to keep environment clean
    await page.locator('header select').selectOption({ value: 'en' });
  });

  test('GRN list page at 768px viewport has no horizontal overflow', async ({ page }) => {
    // Set viewport to exactly 768px (iPad portrait)
    await page.setViewportSize({ width: 768, height: 1024 });

    // 1. Admin logs in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Go to GRN Page
    await page.goto('/goods-receipts');

    // Wait for the table/content to load
    await page.waitForSelector('table');

    // 3. Assert no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      // clientWidth includes padding but not scrollbars
      // scrollWidth is the total width of the content
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);

    // Also check the form page just in case
    await page.goto('/goods-receipts/new');

    // We expect some UI to render even if an error about missing shipmentId shows up
    const hasHorizontalOverflowForm = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflowForm).toBe(false);
  });
});
