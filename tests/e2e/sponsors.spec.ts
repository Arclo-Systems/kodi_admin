import { test, expect } from '@playwright/test';
import { SPONSOR_FIXTURE } from './fixtures';

// El globalSetup seedea el sponsor SPONSOR_FIXTURE + 1 nota + 1 documento + 1 factura draft.
// Read-only: no arrastra, no crea, no emite.
test('sponsors: Kanban → detalle con CRM (notas) y facturas (read-only)', async ({ page }) => {
  // Kanban con el sponsor del fixture.
  await page.goto('/economy/sponsors');
  await expect(page.getByRole('heading', { name: 'Sponsors' })).toBeVisible();
  const card = page.getByText(SPONSOR_FIXTURE.name);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/economy/sponsors/${SPONSOR_FIXTURE.sponsorId}$`));

  // Detalle: cabecera + tabs.
  await expect(page.getByRole('heading', { name: SPONSOR_FIXTURE.name })).toBeVisible();

  // Tab Notas → la nota seedeada.
  await page.getByRole('tab', { name: 'Notas' }).click();
  await expect(page.getByText(SPONSOR_FIXTURE.noteBody)).toBeVisible();

  // Tab Facturas → la factura seedeada.
  await page.getByRole('tab', { name: 'Facturas' }).click();
  await expect(page.getByText(SPONSOR_FIXTURE.invoiceNumber)).toBeVisible();
});
