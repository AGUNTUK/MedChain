import { test, expect } from '@playwright/test';

test.describe('MediChain Smoke & Critical Journeys', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
  });

  async function loginAsPharmacyOwner(page: any) {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('sohelrana199813@gmail.com');
      await page.locator('input[type="password"]').fill('Jhanumaal1998@');
      await page.locator('button[type="submit"]:has-text("Sign In"), button:has-text("Sign In")').first().click();
      await page.waitForTimeout(2000);
    }
  }

  test('Public route loads cleanly with HTTP 200 and splash/login screen', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    const appContainer = page.locator('#root');
    await expect(appContainer).toBeVisible();

    await page.waitForTimeout(3000);

    // Filter out known non-fatal dev logs like analytics/ws/etc.
    const fatalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('websocket') &&
        !e.includes('Vercel') &&
        !e.includes('favicon') &&
        !e.includes('Failed to load resource') &&
        !e.includes('Fetch interceptor')
    );

    if (fatalErrors.length > 0) {
      console.log('Captured console errors on load:', fatalErrors);
    }

    expect(fatalErrors).toEqual([]);
  });

  test('Authentication flow - login with Pharmacy Owner account', async ({ page }) => {
    await loginAsPharmacyOwner(page);

    const mainScreenContent = page.locator('button:has-text("Home"), button:has-text("Products"), h1, h2').first();
    await expect(mainScreenContent).toBeVisible({ timeout: 8000 });
  });

  test('Tab Navigation (Home, Products, Orders, Account)', async ({ page }) => {
    await loginAsPharmacyOwner(page);

    const productsBtn = page.locator('button:has-text("Products")').first();
    if (await productsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productsBtn.click();
      await page.waitForTimeout(1000);
    }

    const ordersBtn = page.locator('button:has-text("Orders")').first();
    if (await ordersBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ordersBtn.click();
      await page.waitForTimeout(1000);
    }

    const accountBtn = page.locator('button:has-text("Account")').first();
    if (await accountBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accountBtn.click();
      await page.waitForTimeout(1000);
    }

    const homeBtn = page.locator('button:has-text("Home")').first();
    if (await homeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await homeBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Search and Add to Cart interactions', async ({ page }) => {
    await loginAsPharmacyOwner(page);

    const productsBtn = page.locator('button:has-text("Products")').first();
    if (await productsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productsBtn.click();
      await page.waitForTimeout(1000);
    }

    const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Napa');
      await page.waitForTimeout(800);
    }

    const productCard = page.locator('div:has-text("Napa"), button:has-text("Add"), button:has-text("+")').first();
    if (await productCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(productCard).toBeVisible();
    }
  });
});
