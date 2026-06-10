import { test, expect } from '@playwright/test';

// Read-only: la pantalla carga, muestra las secciones y los defaults históricos.
test('recompensas: carga con secciones y defaults', async ({ page }) => {
  await page.goto('/economy/rewards');
  await expect(page.getByRole('heading', { name: 'Recompensas' })).toBeVisible();

  for (const section of [
    'XP (todo XP suma a la liga)',
    'Partida Kodi (duelo)',
    'Hábito diario',
  ]) {
    await expect(page.getByRole('heading', { name: section })).toBeVisible();
  }

  // Defaults visibles sin config guardada (XP por correcta = 10, bono de duelo = 5).
  await expect(page.locator('#r-leagueXpPerCorrect')).toHaveValue('10');
  await expect(page.locator('#r-duelWinKolones')).toHaveValue('5');
});

test('recompensas: el selector de país resetea a defaults', async ({ page }) => {
  await page.goto('/economy/rewards');
  await page.getByLabel('País de la configuración').click();
  await page.getByRole('option', { name: /GT ·/ }).click();
  await expect(page.locator('#r-leagueXpPerCorrect')).toHaveValue('10');
});
