import { test, expect } from '@playwright/test';
import { BOTS_FIXTURE } from './fixtures';

// Bots (Área 24). Read-only sobre el storageState: /bots renderiza las tabs y sus listas
// resuelven contra el backend con los fixtures (4 plantillas + 1 bot con BotConfig).

test('bots: la lista renderiza con el bot fixture y su plantilla', async ({
  page,
}) => {
  await page.goto('/bots');
  await expect(page.getByRole('heading', { name: 'Bots' })).toBeVisible();
  await expect(page.getByText(BOTS_FIXTURE.botName)).toBeVisible();
  await expect(page.getByText('No se pudieron cargar los bots.')).toHaveCount(0);
});

test('bots: la tab Plantillas muestra las 4 dificultades', async ({ page }) => {
  await page.goto('/bots');
  await page.getByRole('tab', { name: 'Plantillas' }).click();
  for (const name of ['Fácil', 'Medio', 'Difícil', 'Maestro']) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
});

test('bots: la tab Métricas renderiza sin error', async ({ page }) => {
  await page.goto('/bots');
  await page.getByRole('tab', { name: 'Métricas' }).click();
  await expect(
    page.getByText('No se pudieron cargar las métricas.'),
  ).toHaveCount(0);
});
