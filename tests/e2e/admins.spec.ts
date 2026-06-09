import { test, expect } from '@playwright/test';

// Requiere el backend Kodi en NEXT_PUBLIC_API_URL con el admin seedeado.
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'emiliorb26@gmail.com';

test('lista de admins muestra el admin actual', async ({ page }) => {
  // storageState ya autentica; vamos al dashboard (tiene el sidebar) y navegamos por los links.
  await page.goto('/');

  await page.getByRole('link', { name: 'Admins' }).click();
  await expect(page).toHaveURL(/\/admins$/);
  // El email aparece también en el sidebar (nav-user) → scopear a la tabla.
  const cell = page.locator('table').getByText(EMAIL);
  await expect(cell).toBeVisible();

  // Navega al detalle (GET /admins/:id) y valida el form de edición + sesiones.
  await cell.click();
  await expect(page).toHaveURL(/\/admins\/[0-9a-f-]+$/);
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible();
  await expect(page.getByText('Sesiones')).toBeVisible();
});
