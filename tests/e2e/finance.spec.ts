import { test, expect, type Page } from '@playwright/test';

// Contabilidad de partida doble: un gasto nace, se asienta y suma al P&L; al
// anularlo nace su reverso y el P&L vuelve exactamente a donde estaba.
//
// Requiere el plan de cuentas sembrado en la BD de desarrollo
// (`npm run seed:accounting` en el backend hermano): sin cuentas contables el
// alta falla con 409 CATEGORY_WITHOUT_ACCOUNT. El spec mapea la categoría que
// va a usar, así que no depende de que alguien la haya mapeado antes.
const AMOUNT = '1234.56';
const AMOUNT_LABEL = '1 234,56 CRC';
const VENDOR = `E2E · Anulación ${Date.now()}`;
const VOID_REASON = 'Cargado por el e2e de anulación';

const gastosCard = (page: Page) =>
  page.locator('[data-slot="card"]').filter({ hasText: 'Gastos (CRC)' });

async function gastosCrc(page: Page): Promise<string> {
  await page.goto('/finance');
  // El selector de moneda solo aparece cuando hay más de una en el rango.
  const moneda = page.getByRole('combobox', { name: 'Moneda' });
  if (await moneda.isVisible().catch(() => false)) {
    await moneda.click();
    await page.getByRole('option', { name: 'CRC', exact: true }).click();
  }
  const card = gastosCard(page);
  await expect(card).toBeVisible();
  return (await card.locator('[data-slot="card-content"]').innerText()).trim();
}

async function pick(page: Page, combobox: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

// Devuelve el nombre de una categoría de gasto que quede mapeada a una cuenta.
async function mapExpenseCategory(page: Page): Promise<string> {
  await page.goto('/finance/categorias');
  await pick(page, 'Filtrar por tipo', 'Gasto');

  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toBeVisible();
  await firstRow.getByRole('button', { name: 'Editar' }).click();

  const name = await page.getByLabel('Nombre').inputValue();

  const account = page.getByRole('combobox', { name: 'Cuenta contable' });
  await account.click();
  // La primera opción es "Sin cuenta": la segunda es la primera cuenta real del plan.
  const realAccount = page.getByRole('option').nth(1);
  await expect(
    realAccount,
    'El plan de cuentas está vacío: corré `npm run seed:accounting` en el backend.',
  ).toBeVisible();
  await realAccount.click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Categoría actualizada')).toBeVisible();

  return name;
}

test('gasto contabilizado: entra al P&L, se anula con motivo y deja de sumar', async ({ page }) => {
  const categoria = await mapExpenseCategory(page);
  const gastosAntes = await gastosCrc(page);

  // Alta.
  await page.goto('/finance/movimientos/new');
  await pick(page, 'Tipo', 'Gasto');
  await pick(page, 'Categoría', categoria);
  await page.getByLabel('Monto').fill(AMOUNT);
  await pick(page, 'Moneda', 'CRC');
  await page.getByLabel('Proveedor / fuente').fill(VENDOR);
  await page.getByRole('button', { name: 'Crear movimiento' }).click();
  await expect(page.getByText('Movimiento creado')).toBeVisible();

  // Aparece en Movimientos, activo y con el monto formateado.
  await expect(page).toHaveURL(/\/finance\/movimientos$/);
  const fila = page.locator('table tbody tr').filter({ hasText: VENDOR });
  await expect(fila).toBeVisible();
  await expect(fila.getByText(AMOUNT_LABEL)).toBeVisible();
  await expect(fila.getByText('Activo')).toBeVisible();

  // Suma al P&L.
  expect(await gastosCrc(page)).not.toBe(gastosAntes);

  // Anular exige motivo.
  await page.goto('/finance/movimientos');
  await fila.getByRole('button', { name: 'Anular' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Anular movimiento')).toBeVisible();
  const confirmar = dialog.getByRole('button', { name: 'Anular' });
  await expect(confirmar).toBeDisabled();
  await dialog.getByLabel('Motivo').fill(VOID_REASON);
  await expect(confirmar).toBeEnabled();
  await confirmar.click();

  // Queda anulado y ya no se puede volver a anular.
  await expect(fila.getByText('Anulado')).toBeVisible();
  await expect(fila.getByRole('button', { name: 'Anular' })).toHaveCount(0);

  // Y el P&L vuelve exactamente a donde estaba.
  expect(await gastosCrc(page)).toBe(gastosAntes);
});
