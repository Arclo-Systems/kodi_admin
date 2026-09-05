import { test, expect, type Locator, type Page } from '@playwright/test';
import { FINANCE_FIXTURE } from './fixtures';

// Contabilidad de partida doble: un gasto nace, se asienta y suma al P&L; al
// anularlo nace su reverso y el P&L vuelve exactamente a donde estaba.
//
// El globalSetup seedea el fixture: plan de cuentas completo, período del mes
// corriente en OPEN y las dos categorías de gasto de `FINANCE_FIXTURE` (una
// mapeada a `6900`, otra sin cuenta). El spec no mapea ni remapea nada: no toca
// datos que otro spec pueda estar leyendo.
// Serial: con `fullyParallel` los cinco escribirían la misma contabilidad a la vez
// (mismo código de cuenta libre, mismos saldos a medio comparar) y `default` no
// alcanza para desactivarlo.
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

// Primer `69xx` que el árbol todavía no tiene. Sin esto el alta solo se puede
// correr una vez: no hay DELETE de cuentas.
async function freeChildCode(page: Page): Promise<string> {
  const celdas = await page.locator('table tbody tr td:first-child').allInnerTexts();
  const usados = new Set(celdas.map((t) => t.trim().slice(0, 4)));
  for (let n = 1; n < 100; n += 1) {
    const code = `69${String(n).padStart(2, '0')}`;
    if (!usados.has(code)) return code;
  }
  throw new Error('No quedan códigos 69xx libres en el plan de cuentas.');
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

  // Suma al P&L exactamente el monto del gasto.
  expect(aNumero(await gastosCrc(page)) - aNumero(gastosAntes)).toBeCloseTo(AMOUNT_NUMBER, 2);

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
  expect(aNumero(await gastosCrc(page)) - aNumero(gastosAntes)).toBeCloseTo(AMOUNT_NUMBER, 2);
});

test('el plan de cuentas agrega una cuenta hija, la muestra en el árbol y la retira', async ({
  page,
}) => {
  await page.goto('/finance/cuentas');
  // La tabla arranca con skeletons: leer los códigos antes de que llegue el plan
  // daría una lista vacía y el código "libre" ya estaría tomado.
  await expect(
    page.locator('table tbody tr').filter({ hasText: FINANCE_FIXTURE.parentAccount.slice(0, 4) }),
  ).toBeVisible();

  // Una cuenta no se borra: si el alta reusara un código fijo, la segunda corrida
  // chocaría con 409 ACCOUNT_CODE_EXISTS. Se toma el primer 69xx libre del árbol.
  const code = await freeChildCode(page);
  const name = `${FINANCE_FIXTURE.childName} ${code}`;

  await page.getByRole('button', { name: 'Nueva cuenta' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Cuenta padre' }).click();
  await page.getByRole('option', { name: FINANCE_FIXTURE.parentAccount, exact: true }).click();
  await dialog.getByLabel('Código').fill(code);
  await dialog.getByLabel('Nombre').fill(name);
  await dialog.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Cuenta creada')).toBeVisible();

  const fila = page.locator('table tbody tr').filter({ hasText: name });
  await expect(fila).toBeVisible();
  // La clase la heredó del padre: nunca viajó en el formulario.
  await expect(fila).toContainText('Gasto operativo');
  await expect(fila).toContainText('Activa');

  // Y se retira (no se borra), confirmando el arrastre a las subcuentas.
  await fila.getByRole('button', { name: 'Editar' }).click();
  await dialog.getByRole('switch', { name: 'Activa' }).click();
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(
    page.getByText(
      'Al retirar esta cuenta también dejan de estar disponibles sus subcuentas para nuevos movimientos.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retirar' }).click();
  await expect(page.getByText('Cuenta actualizada')).toBeVisible();
  await expect(fila).toContainText('Retirada');
});

test('renombrar una cuenta con asientos no dispara el 409 de moneda', async ({ page }) => {
  // `6900` es la cuenta contra la que se asientan los gastos del fixture, así que
  // en esta base tiene líneas sí o sí. El PATCH que reenviaba `currency` sin
  // cambio moría acá con ACCOUNT_HAS_LINES ("su moneda no se puede cambiar"),
  // un error que no tenía nada que ver con lo que se pidió.
  const [code, ...rest] = FINANCE_FIXTURE.mappedAccount.split(' ');
  const original = rest.join(' ');
  const renombrada = `${original} (e2e)`;

  await page.goto('/finance/cuentas');
  const fila = page.locator('table tbody tr').filter({ hasText: code as string });
  await expect(fila).toBeVisible();

  const dialog = page.getByRole('dialog');
  await fila.getByRole('button', { name: 'Editar' }).click();
  // El código se lee pero no se cambia.
  await expect(dialog.getByLabel('Código')).toHaveAttribute('readonly', '');
  await dialog.getByLabel('Nombre').fill(renombrada);
  await dialog.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('Cuenta actualizada')).toBeVisible();
  await expect(page.getByText(/no se puede cambiar/)).toHaveCount(0);
  await expect(page.locator('table tbody tr').filter({ hasText: renombrada })).toBeVisible();

  // Se deja el plan como estaba: el nombre lo usan los otros specs.
  await page.locator('table tbody tr').filter({ hasText: renombrada }).getByRole('button', { name: 'Editar' }).click();
  await dialog.getByLabel('Nombre').fill(original);
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Cuenta actualizada')).toBeVisible();
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
