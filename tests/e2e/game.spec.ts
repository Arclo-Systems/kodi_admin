import { test, expect } from '@playwright/test';
import { GAME_FIXTURE } from './fixtures';

// Juego (Ola gameplay). Read-only sobre el storageState: /game renderiza las 3 tabs y sus listas
// resuelven contra el backend con los fixtures (1 partida/arena/simulacro terminados). El detalle
// de la partida renderiza (cabecera + panel de sospecha).

test('juego: la lista de partidas renderiza con la partida fixture', async ({ page }) => {
  await page.goto('/game');
  await expect(page.getByRole('heading', { name: 'Juego' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver' }).first()).toBeVisible();
  await expect(page.getByText('No se pudieron cargar los datos.')).toHaveCount(0);
});

test('juego: las tabs Arena y Simulacros renderizan sus listas', async ({ page }) => {
  await page.goto('/game');
  await page.getByRole('tab', { name: 'Arena' }).click();
  await expect(page.getByRole('link', { name: 'Ver' }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Simulacros' }).click();
  await expect(page.getByRole('link', { name: 'Ver' }).first()).toBeVisible();
});

test('juego: el detalle de la partida fixture renderiza con panel de sospecha', async ({
  page,
}) => {
  await page.goto(`/game/matches/${GAME_FIXTURE.matchId}`);
  await expect(page.getByRole('heading', { name: 'Partida' })).toBeVisible();
  await expect(page.getByText('Indicadores de sospecha')).toBeVisible();
});
