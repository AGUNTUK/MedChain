import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

test.describe('Visual Regression & Viewport Screenshots', () => {
  test.beforeAll(() => {
    const dir = path.join(process.cwd(), 'test-results', 'screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  for (const vp of viewports) {
    test(`Capture screenshot on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForTimeout(1000);

      const screenshotPath = path.join(
        process.cwd(),
        'test-results',
        'screenshots',
        `home__${vp.name}.png`
      );

      await page.screenshot({ path: screenshotPath, fullPage: true });
      expect(fs.existsSync(screenshotPath)).toBe(true);
    });
  }
});
