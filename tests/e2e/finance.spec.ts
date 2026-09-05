import { test, expect, type Page } from '@playwright/test';
import { FINANCE_FIXTURE } from './fixtures';

// Contabilidad de partida doble: un gasto nace, se asienta y suma al P&L; al
// anularlo nace su reverso y el P&L vuelve exactamente a donde estaba.
//
// El globalSetup seedea el fixture: plan de cuentas completo, período del mes
// corriente en OPEN y las dos categorías de gasto de `FINANCE_FIXTURE` (una
// mapeada a `6900`, otra sin cuenta). El spec no mapea ni remapea nada: no toca
// datos que otro spec pueda estar leyendo.
const AMOUNT = '1234.56';
const AMOUNT_LABEL = '1 234,56 CRC';
const VOID_REASON = 'Cargado por el e2e de anulación';

// El proveedor es la única marca propia del movimiento: único por corrida para
// que la fila se identifique sin `nth()` y para que dos corridas no se pisen.
const vendorTag = () => `E2E · Anulación ${Date.now()}`;

async function pick(page: Page, combobox: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

// Total de gastos en CRC del dashboard, tal cual se lee en pantalla.
async function gastosCrc(page: Page): Promise<string> {
  await page.goto('/finance');
  // El selector de moneda solo aparece cuando hay más de una en el rango.
  const moneda = page.getByRole('combobox', { name: 'Moneda' });
  if (await moneda.isVisible().catch(() => false)) {
    await pick(page, 'Moneda', 'CRC');
  }
  const card = page.locator('[data-slot="card"]').filter({ hasText: 'Gastos (CRC)' });
  await expect(card).toBeVisible();
  return (await card.locator('[data-slot="card-content"]').innerText()).trim();
}

// La lista se acota a gastos en CRC para que el movimiento recién creado (el más
// reciente, `orderBy date desc`) esté sí o sí en la primera página.
async function gastosCrcRow(page: Page, vendor: string) {
  await page.goto('/finance/movimientos');
  await pick(page, 'Filtrar por signo', 'Gasto');
  await pick(page, 'Filtrar por moneda', 'CRC');
  return page.locator('table tbody tr').filter({ hasText: vendor });
}

test('gasto contabilizado: entra al P&L, se anula con motivo y deja de sumar', async ({ page }) => {
  const vendor = vendorTag();
  const gastosAntes = await gastosCrc(page);

  // Alta con la categoría mapeada del fixture.
  await page.goto('/finance/movimientos/new');
  await pick(page, 'Tipo', 'Gasto');
  await pick(page, 'Categoría', FINANCE_FIXTURE.mappedCategory);
  await page.getByLabel('Monto').fill(AMOUNT);
  await pick(page, 'Moneda', 'CRC');
  await page.getByLabel('Proveedor / fuente').fill(vendor);
  await page.getByRole('button', { name: 'Crear movimiento' }).click();
  await expect(page.getByText('Movimiento creado')).toBeVisible();
  await expect(page).toHaveURL(/\/finance\/movimientos$/);

  // Aparece en Movimientos, activo y con los centavos formateados.
  const fila = await gastosCrcRow(page, vendor);
  await expect(fila).toBeVisible();
  await expect(fila.getByText(AMOUNT_LABEL)).toBeVisible();
  await expect(fila.getByText('Activo')).toBeVisible();

  // Suma al P&L.
  expect(await gastosCrc(page)).not.toBe(gastosAntes);

  // Anular exige motivo.
  const filaVigente = await gastosCrcRow(page, vendor);
  await filaVigente.getByRole('button', { name: 'Anular' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Anular movimiento')).toBeVisible();
  const confirmar = dialog.getByRole('button', { name: 'Anular' });
  await expect(confirmar).toBeDisabled();
  await dialog.getByLabel('Motivo').fill(VOID_REASON);
  await expect(confirmar).toBeEnabled();
  await confirmar.click();

  // Queda anulado y ya no se puede volver a anular.
  await expect(filaVigente.getByText('Anulado')).toBeVisible();
  await expect(filaVigente.getByRole('button', { name: 'Anular' })).toHaveCount(0);

  // Y el P&L vuelve exactamente a donde estaba.
  expect(await gastosCrc(page)).toBe(gastosAntes);
});

test('una categoría sin cuenta contable no se puede elegir y el aviso dice dónde arreglarla', async ({
  page,
}) => {
  await page.goto('/finance/movimientos/new');
  await pick(page, 'Tipo', 'Gasto');

  // El backend rechaza el alta con 409 CATEGORY_WITHOUT_ACCOUNT; el formulario no
  // deja llegar hasta ahí: la ofrece deshabilitada para que se vea que existe.
  await expect(page.getByText('Hay categorías sin cuenta contable.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Asignalas en Categorías.' })).toHaveAttribute(
    'href',
    '/finance/categorias',
  );

  await page.getByRole('combobox', { name: 'Categoría' }).click();
  const huerfana = page.getByRole('option', {
    name: `${FINANCE_FIXTURE.unmappedCategory} — sin cuenta contable`,
    exact: true,
  });
  await expect(huerfana).toHaveAttribute('aria-disabled', 'true');
  await expect(
    page.getByRole('option', { name: FINANCE_FIXTURE.mappedCategory, exact: true }),
  ).not.toHaveAttribute('aria-disabled', 'true');
});
