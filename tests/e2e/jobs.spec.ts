import { test, expect } from '@playwright/test';

// Jobs UI (Ola 3c). Read-only sobre el harness storageState: /jobs renderiza el heading,
// los conteos por estado (KpiCards) y resuelve la lista (cola vacía → empty state, o tabla),
// confirmando que /v1/admin/jobs respondió sin error.
test('jobs: la página renderiza conteos y resuelve la lista sin error', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();

  // Conteos por estado (se renderizan aunque la cola esté vacía).
  await expect(page.getByText('Completados')).toBeVisible();
  await expect(page.getByText('Demorados')).toBeVisible();

  // La lista resolvió: empty state (cola vacía) o tabla con jobs; sin error de carga.
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Sin jobs').or(page.locator('table'))).toBeVisible();
  await expect(page.getByText('No se pudieron cargar los jobs.')).toHaveCount(0);
});
