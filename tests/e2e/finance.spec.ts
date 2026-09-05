import { test, expect, type Locator, type Page } from '@playwright/test';
import { FINANCE_FIXTURE } from './fixtures';

// Contabilidad de partida doble: un gasto nace, se asienta y suma al P&L; al
// anularlo nace su reverso y el P&L vuelve exactamente a donde estaba.
//
// El globalSetup seedea el fixture: plan de cuentas completo, período del mes
// corriente en OPEN y las dos categorías de gasto de `FINANCE_FIXTURE` (una
// mapeada a `6900`, otra sin cuenta). El spec no mapea ni remapea nada: no toca
// datos que otro spec pueda estar leyendo.
// Los tests escriben en la misma contabilidad (misma categoría, misma cuenta,
// misma moneda) y miden saldos: en paralelo el alta de uno mueve el número que
// otro está a mitad de comparar. Van en serie.
test.describe.configure({ mode: 'serial' });

const AMOUNT = '1234.56';
const AMOUNT_NUMBER = 1234.56;
const AMOUNT_LABEL = '1 234,56 CRC';
const VOID_REASON = 'Cargado por el e2e de anulación';

// El proveedor es la única marca propia del movimiento: único por corrida para
// que la fila se identifique sin `nth()` y para que dos corridas no se pisen.
const vendorTag = (etiqueta: string) => `E2E · ${etiqueta} ${Date.now()}`;

// '1 234,56 CRC' → 1234.56. Los montos se pintan en formato es-CR (espacio duro
// de miles, coma decimal): compararlos como texto ataría el test al saldo previo
// de la base, que otras corridas ya movieron.
const aNumero = (texto: string): number =>
  Number(texto.replace(/[^\d,-]/g, '').replace(',', '.'));

async function pick(page: Page, combobox: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

// Total de gastos operativos en CRC del dashboard, tal cual se lee en pantalla.
async function gastosCrc(page: Page): Promise<string> {
  await page.goto('/finance');
  // El selector de moneda solo aparece cuando hay más de una en el rango.
  const moneda = page.getByRole('combobox', { name: 'Moneda' });
  if (await moneda.isVisible().catch(() => false)) {
    await pick(page, 'Moneda', 'CRC');
  }
  const card = page.locator('[data-slot="card"]').filter({ hasText: 'Gastos operativos (CRC)' });
  await expect(card).toBeVisible();
  return (await card.locator('[data-slot="card-content"]').innerText()).trim();
}

// La lista se acota a gastos en CRC para que el movimiento recién creado (el más
// reciente, `orderBy date desc`) esté sí o sí en la primera página.
async function gastosCrcRow(page: Page, vendor: string): Promise<Locator> {
  await page.goto('/finance/movimientos');
  await pick(page, 'Filtrar por signo', 'Gasto');
  await pick(page, 'Filtrar por moneda', 'CRC');
  return page.locator('table tbody tr').filter({ hasText: vendor });
}

async function crearGasto(page: Page, vendor: string): Promise<void> {
  await page.goto('/finance/movimientos/new');
  await pick(page, 'Tipo', 'Gasto');
  await pick(page, 'Categoría', FINANCE_FIXTURE.mappedCategory);
  await page.getByLabel('Monto').fill(AMOUNT);
  await pick(page, 'Moneda', 'CRC');
  await page.getByLabel('Proveedor / fuente').fill(vendor);
  await page.getByRole('button', { name: 'Crear movimiento' }).click();
  await expect(page.getByText('Movimiento creado')).toBeVisible();
  await expect(page).toHaveURL(/\/finance\/movimientos$/);
}

// Abre el mayor de la cuenta mapeada del fixture y devuelve su saldo final.
async function abrirMayor(page: Page): Promise<number> {
  await page.goto('/finance/mayor');
  await pick(page, 'Cuenta', FINANCE_FIXTURE.mappedAccount);
  const saldo = page
    .getByText('Saldo final', { exact: true })
    .locator('xpath=following-sibling::p');
  await expect(saldo).toBeVisible();
  return aNumero(await saldo.innerText());
}

test('gasto contabilizado: entra al P&L, se anula con motivo y deja de sumar', async ({ page }) => {
  const vendor = vendorTag('Anulación');
  const gastosAntes = await gastosCrc(page);

  await crearGasto(page, vendor);

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

test('el gasto recorre el libro: mayor con saldo corrido, comprobación que cuadra y P&L', async ({
  page,
}) => {
  const vendor = vendorTag('Mayor');
  const saldoAntes = await abrirMayor(page);
  const gastosAntes = await gastosCrc(page);

  await crearGasto(page, vendor);

  // El asiento aparece en el mayor de la cuenta de la categoría, con su débito.
  const saldoDespues = await abrirMayor(page);
  const linea = page.locator('table tbody tr').filter({ hasText: vendor });
  await expect(linea).toBeVisible();
  await expect(linea).toContainText('1 234,56');
  // El saldo corrido se movió exactamente el monto del gasto.
  expect(saldoDespues - saldoAntes).toBeCloseTo(AMOUNT_NUMBER, 2);

  // Débitos == créditos: es lo que hace que el asiento sea partida doble.
  await page.goto('/finance/comprobacion');
  await expect(page.getByText('Cuadra', { exact: true })).toBeVisible();
  await expect(page.getByText(/No cuadra/)).toHaveCount(0);
  await expect(page.getByText('Diferencia (débitos − créditos)')).toBeVisible();

  // Y el mismo gasto está en el estado de resultados, que sale del mayor.
  expect(await gastosCrc(page)).not.toBe(gastosAntes);
});

test('el plan de cuentas deja agregar una cuenta hija y la muestra en el árbol', async ({
  page,
}) => {
  await page.goto('/finance/cuentas');
  // La tabla arranca con skeletons: contar antes de que llegue el plan da cero y
  // el test intentaría crear una cuenta que ya existe (409 ACCOUNT_CODE_EXISTS).
  await expect(
    page.locator('table tbody tr').filter({ hasText: FINANCE_FIXTURE.parentAccount.slice(0, 4) }),
  ).toBeVisible();
  const fila = page.locator('table tbody tr').filter({ hasText: FINANCE_FIXTURE.childCode });

  // Una cuenta no se borra (se retira), así que el alta corre una sola vez: en
  // la segunda corrida el test verifica que la cuenta sigue en el árbol.
  if ((await fila.count()) === 0) {
    await page.getByRole('button', { name: 'Nueva cuenta' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Cuenta padre' }).click();
    await page.getByRole('option', { name: FINANCE_FIXTURE.parentAccount, exact: true }).click();
    await dialog.getByLabel('Código').fill(FINANCE_FIXTURE.childCode);
    await dialog.getByLabel('Nombre').fill(FINANCE_FIXTURE.childName);
    await dialog.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Cuenta creada')).toBeVisible();
  }

  await expect(fila).toBeVisible();
  await expect(fila).toContainText(FINANCE_FIXTURE.childName);
  // La clase la heredó del padre: nunca viajó en el formulario.
  await expect(fila).toContainText('Gasto operativo');
  await expect(fila).toContainText('Activa');
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
