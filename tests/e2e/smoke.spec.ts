import { test, expect } from '@playwright/test';

test('home renderiza', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
