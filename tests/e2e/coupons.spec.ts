import { test, expect } from '@playwright/test';
import { COUPON_FIXTURE } from './fixtures';

// El globalSetup seedea el fixture (cupón COUPON_FIXTURE + un canje del admin).
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'emiliorb26@gmail.com';

test('detalle de cupón: stats, drill-down de canjes y regenerar código', async ({ page }) => {
  // Lista de cupones → click en el cupón del fixture.
  await page.goto('/economy/coupons');
  const listRow = page.locator('table').getByText(COUPON_FIXTURE.couponTitle);
  await expect(listRow).toBeVisible();
  await listRow.click();
  await expect(page).toHaveURL(new RegExp(`/economy/coupons/${COUPON_FIXTURE.couponId}$`));

  // Cabecera + KPIs de stats.
  await expect(page.getByRole('heading', { name: COUPON_FIXTURE.couponTitle })).toBeVisible();
  await expect(page.getByText('Canjeados')).toBeVisible();
  await expect(page.getByText('Tasa de redención')).toBeVisible();

  // Drill-down: la tabla de canjes muestra la fila del canje seedeado (join de usuario).
  // No asertamos el código literal porque "Regenerar" lo muta (test repetible).
  const redemptions = page.locator('table');
  await expect(redemptions.getByText(EMAIL)).toBeVisible();

  // Acción regenerar (admin): abre el ConfirmDialog y confirma → toast con el nuevo código.
  await redemptions.getByRole('button', { name: 'Regenerar' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Regenerar código')).toBeVisible();
  await dialog.getByRole('button', { name: 'Regenerar' }).click();
  await expect(page.getByText(/Nuevo código/)).toBeVisible();
});
