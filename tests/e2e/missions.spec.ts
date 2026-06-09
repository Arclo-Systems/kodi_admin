import { test, expect } from '@playwright/test';
import { MISSION_FIXTURE } from './fixtures';

// El globalSetup seedea el template MISSION_FIXTURE. Read-only: no crea ni interviene.
test('misiones: lista de templates, edición y página de config (read-only)', async ({ page }) => {
  // Lista de templates → click en el del fixture → form de edición con el título poblado.
  await page.goto('/economy/missions');
  const row = page.locator('table').getByText(MISSION_FIXTURE.title);
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(
    new RegExp(`/economy/missions/${MISSION_FIXTURE.templateId}/edit$`),
  );
  await expect(page.getByRole('heading', { name: 'Editar template de misión' })).toBeVisible();
  await expect(page.locator('#m-title')).toHaveValue(MISSION_FIXTURE.title);

  // Página de refresh-config renderiza.
  await page.goto('/economy/missions/config');
  await expect(page.getByText('Costo de cambiar misión')).toBeVisible();
  await expect(page.getByLabel('Costo en Kokos')).toBeVisible();
});
