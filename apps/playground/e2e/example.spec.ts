import { test, expect } from '@playwright/test';

test('grid has the expected logical size', async ({ page }) => {
  await page.goto('/');

  const gridDebug = page.locator('text=Grid').locator('..');

  await expect(gridDebug).toContainText('"rows": 100000');
  await expect(gridDebug).toContainText('"columns": 1000');
});
