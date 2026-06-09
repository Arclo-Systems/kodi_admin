import { test, expect } from '@playwright/test';
import { FEATURE_FIXTURE } from './fixtures';

// El globalSetup seedea FEATURE_FIXTURE (idea en "En construcción"). Read-only: no crea ni arrastra.
test('features: board con 4 columnas y la idea seedeada', async ({ page }) => {
  await page.goto('/features');
  await expect(page.getByRole('heading', { name: 'Features / Ideas' })).toBeVisible();

  for (const label of ['Idea', 'En construcción', 'Lanzado', 'Descartado']) {
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }

  await expect(page.getByText(FEATURE_FIXTURE.title)).toBeVisible();
});

test('features: el form de nueva idea abre en modal', async ({ page }) => {
  await page.goto('/features');
  await page.getByRole('button', { name: 'Nueva idea' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva idea' })).toBeVisible();
  await expect(page.getByLabel('Título')).toBeVisible();
});
