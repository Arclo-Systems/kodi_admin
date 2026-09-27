import { test, expect } from '@playwright/test';
import { STORE_FIXTURE } from './fixtures';

// El globalSetup seedea el ítem STORE_FIXTURE. Read-only: no crea ni ajusta inventario.
test('tienda: lista de ítems, edición y diálogo de ajuste de inventario (read-only)', async ({
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

  // El ajuste de inventario es un diálogo de la lista, no una página.
  await page.goto('/economy/store');
  await page.getByRole('button', { name: 'Ajustar inventario' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Ajustar inventario' })).toBeVisible();
  await expect(dialog.getByLabel('Código de amigo')).toBeVisible();
});
