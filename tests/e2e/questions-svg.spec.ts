import { test, expect } from '@playwright/test';

const SMALL_SVG =
  '```svg\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>Demo</title><rect width="10" height="10"/></svg>\n```';

// SVG entre 30 KB y 40 KB: supera el gate (>30720 B) pero NO excede el maxLength=40000 del
// textarea (si lo superara, el fence de cierre se truncaría y el regex no matchearía → gate
// no dispararía). 850 rects ≈ 34 KB. Coords únicas para que el peso no dependa de SVGO.
const HEAVY_SVG =
  '```svg\n<svg xmlns="http://www.w3.org/2000/svg">' +
  Array.from({ length: 850 }, (_, i) => `<rect x="${i}" y="${i}" width="3" height="7"/>`).join('') +
  '</svg>\n```';

test('SVG en el enunciado se ve en la vista previa', async ({ page }) => {
  await page.goto('/content/questions/new');
  await page.locator('#q-text').fill(`Figura:\n\n${SMALL_SVG}`);
  await expect(page.locator('img[src^="data:image/svg+xml"]')).toBeVisible();
});

test('SVG > 30 KB bloquea el guardado', async ({ page }) => {
  await page.goto('/content/questions/new');
  const text = `Pesado:\n\n${HEAVY_SVG}`;
  await page.locator('#q-text').fill(text);
  // sanity: el textarea recibió el contenido completo (no truncado por maxLength)
  await expect(page.locator('#q-text')).toHaveValue(text);
  // selector único (evita el match ambiguo con el aviso del MarkdownField)
  await expect(page.getByTestId('form-heavy-svg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear borrador' })).toBeDisabled();
});
