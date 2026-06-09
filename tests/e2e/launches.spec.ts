import { test, expect } from '@playwright/test';
import { LAUNCHES_FIXTURE } from './fixtures';

// Lanzamientos (módulo Lanzamientos). Read-only sobre el storageState: la página renderiza,
// el tab Versiones lista la versión fixture y el tab Países muestra el roadmap (un país Live y
// uno En preparación). Confirma que /v1/admin/launches/* responde sin error.

test('lanzamientos: el tab Versiones lista la versión fixture', async ({ page }) => {
  await page.goto('/launches');
  await expect(page.getByRole('heading', { name: 'Lanzamientos' })).toBeVisible();
  await expect(page.getByRole('cell', { name: LAUNCHES_FIXTURE.version })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('No se pudieron cargar las versiones.')).toHaveCount(0);
});

test('lanzamientos: el tab Países muestra el roadmap por país', async ({ page }) => {
  await page.goto('/launches');
  await page.getByRole('tab', { name: 'Países' }).click();
  await expect(page.getByText(LAUNCHES_FIXTURE.liveCountry)).toBeVisible();
  await expect(page.getByText(LAUNCHES_FIXTURE.preparingCountry)).toBeVisible();
  await expect(page.getByText('No se pudo cargar el roadmap por país.')).toHaveCount(0);
});
