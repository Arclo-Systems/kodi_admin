import { test, expect } from '@playwright/test';

// Contenido (Ola 2a). Read-only sobre el harness storageState: cada página renderiza su heading
// y su control principal, y las queries resuelven contra el backend (datos reales de kodi_dev)
// sin error. Cierra el gap de verificación runtime/e2e de las 5 áreas de contenido.

test('preguntas: renderiza la página y el buscador', async ({ page }) => {
  await page.goto('/content/questions');
  await expect(page.getByRole('heading', { name: 'Preguntas' })).toBeVisible();
  await expect(page.getByPlaceholder('Buscar texto…')).toBeVisible();
  await page.waitForLoadState('networkidle');
});

test('temas y módulos: renderiza el árbol de contenido', async ({ page }) => {
  await page.goto('/content/modules-tree');
  await expect(page.getByRole('heading', { name: 'Temas y módulos' })).toBeVisible();
  await expect(page.getByText('Árbol de contenido')).toBeVisible();
  await page.waitForLoadState('networkidle');
});

test('noticias: renderiza la lista', async ({ page }) => {
  await page.goto('/content/news');
  await expect(page.getByRole('heading', { name: 'Noticias' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nueva noticia' })).toBeVisible();
  await page.waitForLoadState('networkidle');
});

test('cortes de admisión: renderiza la lista', async ({ page }) => {
  await page.goto('/content/admission-cutoffs');
  await expect(page.getByRole('heading', { name: 'Cortes de admisión' })).toBeVisible();
  await expect(page.getByLabel('Filtrar por estado')).toBeVisible();
  await page.waitForLoadState('networkidle');
});

test('AI prompts: lista los prompts', async ({ page }) => {
  await page.goto('/content/ai-prompts');
  await expect(page.getByRole('heading', { name: 'AI Prompts' })).toBeVisible();
  await expect(page.getByText('Versiones')).toBeVisible();
  await page.waitForLoadState('networkidle');
});
