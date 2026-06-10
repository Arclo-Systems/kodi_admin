import { test, expect } from '@playwright/test';

// Read-only: la pantalla carga, muestra las secciones y los defaults históricos.
test('recompensas: carga con secciones y defaults', async ({ page }) => {
  await page.goto('/economy/rewards');
  await expect(page.getByRole('heading', { name: 'Recompensas' })).toBeVisible();

  for (const section of ['Práctica normal', 'Partida Kodi (duelo)', 'XP de liga', 'Hábito diario']) {
    await expect(page.getByRole('heading', { name: section })).toBeVisible();
  }

  // Defaults visibles sin config guardada (XP por correcta de práctica = 10).
  await expect(page.locator('#r-practiceXpPerCorrect')).toHaveValue('10');
  await expect(page.locator('#r-duelWinKolones')).toHaveValue('5');
});

test('recompensas: el selector de país resetea a defaults', async ({ page }) => {
  await page.goto('/economy/rewards');
  await page.getByLabel('País de la configuración').click();
  await page.getByRole('option', { name: /GT ·/ }).click();
  await expect(page.locator('#r-practiceXpPerCorrect')).toHaveValue('10');
});
