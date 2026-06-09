import { test, expect } from '@playwright/test';

// Monetización (Ola 3b). Read-only sobre el harness storageState: verifica que las 4 páginas
// renderizan y que los endpoints /v1/admin/monetization/* responden (sin mutar).

test('subscription-prices: renderiza la página de precios', async ({ page }) => {
  await page.goto('/economy/subscription-prices');
  await expect(page.getByRole('heading', { name: 'Precios de suscripción' })).toBeVisible();
  await expect(page.getByText('Nuevo precio')).toBeVisible();
});

test('suscripciones: renderiza la lista con Comp/grant', async ({ page }) => {
  await page.goto('/economy/subscriptions');
  await expect(page.getByRole('heading', { name: 'Suscripciones' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Comp/ })).toBeVisible();
});

test('cross-sell: renderiza la página de cross-sell', async ({ page }) => {
  await page.goto('/economy/cross-sell');
  await expect(page.getByRole('heading', { name: 'Cross-sell' })).toBeVisible();
  await expect(page.getByText('Nuevo cross-sell')).toBeVisible();
});

test('monetización: la analítica carga sin error', async ({ page }) => {
  await page.goto('/economy/monetization');
  await expect(page.getByRole('heading', { name: 'Monetización' })).toBeVisible();
  await expect(page.getByText('MRR estimado (mensual)')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('No se pudo cargar la analítica de monetización.')).toHaveCount(0);
});
