import { test, expect } from '@playwright/test';

test('página de usuarios carga con filtros y tabla', async ({ page }) => {
  // storageState ya autentica; vamos al dashboard (tiene el sidebar) y navegamos por los links.
  await page.goto('/');

  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
  // El guard (view:users) + proxy + hook + DataTable renderizan (búsqueda visible).
  await expect(page.getByPlaceholder(/Email, username/)).toBeVisible();
});
