import { test, expect } from '@playwright/test';

test('los nav links Audit log y Health ya no dan 404', async ({ page }) => {
  // storageState ya autentica; vamos al dashboard (tiene el sidebar) y navegamos por los links.
  await page.goto('/');

  await page.getByRole('link', { name: 'Audit log' }).click();
  await expect(page).toHaveURL(/\/audit-log$/);
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();

  await page.getByRole('link', { name: 'Health' }).click();
  await expect(page).toHaveURL(/\/health$/);
  await expect(page.getByRole('heading', { name: 'Health' })).toBeVisible();
  // El backend F responde: la card de API renderiza.
  await expect(page.getByText('API', { exact: true })).toBeVisible();
});
