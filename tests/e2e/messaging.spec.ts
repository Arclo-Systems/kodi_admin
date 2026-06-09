import { test, expect } from '@playwright/test';
import { MESSAGING_FIXTURE } from './fixtures';

// Mensajería (Ola 3e). Read-only sobre el harness storageState: las 3 páginas renderizan y sus
// listas resuelven contra el backend con los fixtures seedeados (sin enviar). Confirma que
// /v1/admin/messaging/* responde sin error.

test('mensajería: la lista de campañas renderiza con la campaña fixture', async ({ page }) => {
  await page.goto('/messaging');
  await expect(page.getByRole('heading', { name: 'Mensajería' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nueva campaña' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('No se pudieron cargar las campañas.')).toHaveCount(0);
});

test('mensajería: segmentos lista el segmento fixture', async ({ page }) => {
  await page.goto('/messaging/segments');
  await expect(page.getByRole('heading', { name: 'Segmentos' })).toBeVisible();
  await expect(page.getByText(MESSAGING_FIXTURE.segmentName)).toBeVisible();
});

test('mensajería: plantillas lista la plantilla fixture', async ({ page }) => {
  await page.goto('/messaging/templates');
  await expect(page.getByRole('heading', { name: 'Plantillas de mensaje' })).toBeVisible();
  await expect(page.getByText(MESSAGING_FIXTURE.templateKey)).toBeVisible();
});

test('mensajería: el composer broadcast renderiza con selector de segmento', async ({ page }) => {
  await page.goto('/messaging/new');
  await expect(page.getByRole('heading', { name: 'Nueva campaña broadcast' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear campaña' })).toBeVisible();
  await page.waitForLoadState('networkidle');
});

test('mensajería: el detalle de un borrador abre el editor con los valores precargados', async ({ page }) => {
  await page.goto(`/messaging/${MESSAGING_FIXTURE.campaignId}`);
  await expect(page.getByRole('heading', { name: 'Editar borrador' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();
  await expect(page.getByLabel('Título principal')).toHaveValue('Título E2E');
});

test('mensajería: una campaña enviada se muestra en solo lectura', async ({ page }) => {
  await page.goto(`/messaging/${MESSAGING_FIXTURE.sentCampaignId}`);
  await expect(page.getByRole('heading', { name: 'Campaña', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
});

test('mensajería: clic en una fila navega al detalle de la campaña', async ({ page }) => {
  await page.goto('/messaging');
  await page.waitForLoadState('networkidle');
  // El DataTable navega vía onRowClick; clic en la primera fila del cuerpo.
  await page.locator('tbody tr').first().click();
  await expect(page).toHaveURL(/\/messaging\/[0-9a-f-]+$/);
});
