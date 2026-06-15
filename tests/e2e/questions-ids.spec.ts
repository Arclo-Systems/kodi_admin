import { test, expect } from '@playwright/test';

test('página de IDs: heading, selector y tabs', async ({ page }) => {
  await page.goto('/content/questions/bulk-import/ids');
  await expect(page.getByRole('heading', { name: 'IDs de materias y temas' })).toBeVisible();
  await expect(page.getByText('Elegí un módulo para ver sus IDs.')).toBeVisible();
  await page.waitForLoadState('networkidle');
});
