import { test, expect } from '@playwright/test';
import { BANNER_FIXTURE } from './fixtures';

// El globalSetup seedea el banner BANNER_FIXTURE. Read-only: no crea ni edita.
test('banners: lista y detalle con preview de placement y stats (read-only)', async ({ page }) => {
  // Lista de banners renderiza con la tabla.
  await page.goto('/economy/banners');
  await expect(page.getByRole('heading', { name: 'Banners' })).toBeVisible();
  await expect(page.locator('table')).toBeVisible();

  // Detalle del banner del fixture: stats + preview de placement.
  await page.goto(`/economy/banners/${BANNER_FIXTURE.bannerId}`);
  await expect(page.getByText('Impresiones')).toBeVisible();
  await expect(page.getByText('CTR')).toBeVisible();
  await expect(page.getByText('Vista previa')).toBeVisible();
  // El placement (practice_home) aparece como "Home de Práctica".
  await expect(page.getByText('Home de Práctica').first()).toBeVisible();
});
