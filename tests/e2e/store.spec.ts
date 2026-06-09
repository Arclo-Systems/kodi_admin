import { test, expect } from '@playwright/test';
import { STORE_FIXTURE } from './fixtures';

// El globalSetup seedea el ítem STORE_FIXTURE. Read-only: no crea ni ajusta inventario.
test('tienda: lista de ítems, edición y página de ajuste de inventario (read-only)', async ({
  page,
}) => {
  // Lista → click en el ítem del fixture → form de edición con el nombre poblado.
  await page.goto('/economy/store');
  const row = page.locator('table').getByText(STORE_FIXTURE.name);
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/economy/store/${STORE_FIXTURE.itemId}/edit$`));
  await expect(page.getByRole('heading', { name: 'Editar ítem de tienda' })).toBeVisible();
  await expect(page.locator('#s-name')).toHaveValue(STORE_FIXTURE.name);

  // Página de ajuste de inventario renderiza.
  await page.goto('/economy/store/inventory');
  await expect(page.getByRole('heading', { name: 'Ajustar inventario' })).toBeVisible();
  await expect(page.getByLabel('ID de usuario')).toBeVisible();
});
