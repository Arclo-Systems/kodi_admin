import { test, expect } from '@playwright/test';

// Dashboard de KPIs (Ola 3a). Read-only: verifica que el home renderiza las secciones
// (engagement, economía, suscriptores) y que los endpoints del backend respondieron
// (sin mensajes de error de carga). Usa el storageState compartido (sin login por-spec).
test('dashboard: home renderiza KPIs de engagement, economía y suscriptores', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();

  // Engagement.
  await expect(page.getByText('Activos hoy (DAU)')).toBeVisible();
  await expect(page.getByText('Preguntas respondidas')).toBeVisible();

  // Economía.
  await expect(page.getByText('Kokos otorgados')).toBeVisible();
  await expect(page.getByText('Premiaciones')).toBeVisible();

  // Suscriptores (card del chart).
  await expect(page.getByText('Suscriptores por plan')).toBeVisible();

  // Retención de cohorte + serie temporal diaria.
  await expect(page.getByText('Retención D1')).toBeVisible();
  await expect(page.getByText('Retención D7')).toBeVisible();
  await expect(page.getByText('Actividad diaria')).toBeVisible();

  // Las secciones cargaron sin error → los endpoints /v1/admin/dashboard/* respondieron.
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('No se pudieron cargar las métricas de engagement.')).toHaveCount(0);
  await expect(page.getByText('No se pudieron cargar las métricas de economía.')).toHaveCount(0);
  await expect(page.getByText('No se pudo cargar la retención.')).toHaveCount(0);
  await expect(page.getByText('No se pudo cargar la serie temporal.')).toHaveCount(0);
});
