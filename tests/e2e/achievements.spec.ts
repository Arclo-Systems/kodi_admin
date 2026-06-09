import { test, expect } from '@playwright/test';
import { ACHIEVEMENT_FIXTURE } from './fixtures';

// El globalSetup seedea el logro ACHIEVEMENT_FIXTURE; el storageState (setup project) ya autentica.
// Read-only: NO ejecuta re-otorgar.

test('detalle de logro: condición, info y panel de re-otorgar (read-only)', async ({ page }) => {
  // Lista → click en el logro del fixture.
  await page.goto('/economy/achievements');
  const row = page.locator('table').getByText(ACHIEVEMENT_FIXTURE.name);
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(
    new RegExp(`/economy/achievements/${ACHIEVEMENT_FIXTURE.achievementId}$`),
  );

  // Cabecera + condición renderizada (count_gte: correct_answers ≥ 10).
  await expect(page.getByRole('heading', { name: ACHIEVEMENT_FIXTURE.name })).toBeVisible();
  await expect(page.getByText('Respuestas correctas ≥ 10')).toBeVisible();

  // Panel de re-otorgar visible para admin (botón presente). NO se ejecuta (read-only).
  await expect(page.getByText('Usuarios con el logro')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-otorgar Kokos' })).toBeVisible();
});
