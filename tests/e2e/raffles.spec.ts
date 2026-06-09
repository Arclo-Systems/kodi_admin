import { test, expect } from '@playwright/test';
import { RAFFLE_FIXTURE } from './fixtures';

// El globalSetup seedea la premiación RAFFLE_FIXTURE (status scheduled → editable).
// Read-only: no completa ni revierte.
test('premiaciones: lista y detalle con completar/ganadores (read-only)', async ({ page }) => {
  // Lista → click en la premiación del fixture.
  await page.goto('/economy/raffles');
  await expect(page.getByRole('heading', { name: 'Premiaciones' })).toBeVisible();
  const row = page.locator('table').getByText(RAFFLE_FIXTURE.name);
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/economy/raffles/${RAFFLE_FIXTURE.raffleId}$`));

  // Detalle: cabecera + premio + módulo (premiación por país+módulo) + form de completar.
  await expect(page.getByRole('heading', { name: RAFFLE_FIXTURE.name })).toBeVisible();
  await expect(page.getByText('Premio de prueba').first()).toBeVisible();
  await expect(page.getByText('Módulo')).toBeVisible();
  await expect(page.getByText('Completar premiación')).toBeVisible();
});
