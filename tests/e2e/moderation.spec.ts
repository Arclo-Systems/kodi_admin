import { test, expect } from '@playwright/test';
import { MODERATION_FIXTURE } from './fixtures';

// Moderación social (Ola 3d). Read-only sobre el harness storageState: la cola renderiza con el
// reporte fixture, el detalle abre, y la lista negra muestra la palabra fixture. Confirma que
// /v1/admin/moderation/* responde sin error.

test('moderación: la cola renderiza con KPIs y el reporte fixture', async ({ page }) => {
  await page.goto('/moderation');
  await expect(page.getByRole('heading', { name: 'Moderación' })).toBeVisible();
  await expect(page.getByText('Abiertos / en revisión')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('No se pudieron cargar los reportes.')).toHaveCount(0);
  // El reporte fixture (severity media, motivo nombre ofensivo) aparece en la cola «open».
  await expect(page.getByText('Nombre ofensivo').first()).toBeVisible();
});

test('moderación: el detalle del reporte abre con acciones de estado', async ({ page }) => {
  await page.goto(`/moderation/${MODERATION_FIXTURE.reportId}`);
  await expect(page.getByRole('heading', { name: 'Reporte' })).toBeVisible();
  await expect(page.getByText('Usuario denunciado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desestimar' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('No se pudo cargar el reporte.')).toHaveCount(0);
});

test('moderación: palabras prohibidas lista la palabra fixture', async ({ page }) => {
  await page.goto('/moderation/prohibited-words');
  await expect(page.getByRole('heading', { name: 'Palabras prohibidas' })).toBeVisible();
  await expect(page.getByPlaceholder('Nueva palabra…')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(MODERATION_FIXTURE.prohibitedWord)).toBeVisible();
});
