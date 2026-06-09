import { test, expect } from '@playwright/test';

test('filtros de usuarios incluyen plan Free y países nuevos', async ({ page }) => {
  // storageState ya autentica; vamos al dashboard (sidebar) y navegamos por los links.
  await page.goto('/');
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(page).toHaveURL(/\/users$/);

  // Plan: Free presente.
  await page.getByRole('combobox').filter({ hasText: 'Plan' }).click();
  await expect(page.getByRole('option', { name: 'Free' })).toBeVisible();
  await page.keyboard.press('Escape');

  // País: Chile/México/Argentina presentes en el filtro.
  await page.getByRole('button', { name: /Todos los países/ }).click();
  await expect(page.getByText('Chile')).toBeVisible();
  await expect(page.getByText('México')).toBeVisible();
  await expect(page.getByText('Argentina')).toBeVisible();
});
