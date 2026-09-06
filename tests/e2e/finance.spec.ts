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

// 90 s por caso en vez de los 30 s por defecto. No es para tapar un test lento:
// cada caso de este spec recorre entre cuatro y seis pantallas de finanzas, y
// contra `next dev` la primera visita de cada ruta la compila on-demand. Con el
// presupuesto por defecto los casos largos quedaban a un segundo del límite y
// fallaban por el reloj, no por la app.
test.beforeEach(() => {
  test.setTimeout(90_000);
});

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
// `/finance` es el índice de la sección desde 2026-09-06: el P&L vive en su
// propia ruta.
async function gastosCrc(page: Page): Promise<string> {
  await page.goto('/finance/dashboard');
  await pick(page, 'Moneda', 'CRC');
  const card = page.locator('[data-slot="card"]').filter({ hasText: 'Gastos operativos (CRC)' });
  await expect(card).toBeVisible();
  return (await card.locator('[data-slot="card-content"]').innerText()).trim();
}

// La fila de un movimiento en la lista, acotada a gastos en CRC.
//
// El backend ordena por `date desc` SIN desempate y todos los movimientos del
// e2e llevan la fecha de hoy: con varias corridas en el mismo día el recién
// creado no cae necesariamente en la primera página de 20. Se sube la página a
// 100 en vez de asumir dónde está — asumirlo hacía fallar al spec con un "nunca
// se asentó" que era falso.
async function gastosCrcRow(page: Page, vendor: string): Promise<Locator> {
  await page.goto('/finance/movimientos');
  await pick(page, 'Filtrar por signo', 'Gasto');
  await pick(page, 'Filtrar por moneda', 'CRC');

  // El selector de tamaño de página es el último combobox de la pantalla (va
  // debajo de la tabla, después de los filtros).
  await page.getByRole('combobox').last().click();
  await page.getByRole('option', { name: '100', exact: true }).click();

  const fila = page.locator('table tbody tr').filter({ hasText: vendor });
  // La tabla usa `keepPreviousData`: hasta que llega la página nueva sigue
  // pintando la anterior. Esperar la fila acá evita leer ese render viejo.
  await expect(fila).toBeVisible();
  return fila;
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
// El día civil de hoy, tal como lo espera el query del mayor (`YYYY-MM-DD`).
const hoyYMD = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Abre el mayor de la cuenta del fixture ACOTADO AL DÍA DE HOY y devuelve su
 * saldo final.
 *
 * El rango viaja por la URL (`?from=&to=`, que es de donde el componente saca su
 * estado inicial) y no por el date picker: con los doce meses por defecto, esta
 * base ya lleva más de cien líneas sobre `6900` —una por corrida acumulada— y el
 * asiento recién creado cae en cualquier página. Peor: el mayor ordena por FECHA
 * sin desempate, así que dentro del día de hoy su posición **no está
 * determinada** (el mismo hueco que el fix round 1 del backend cerró para la
 * lista de movimientos y que en el mayor sigue abierto).
 *
 * Acotando a hoy quedan unas pocas líneas en una sola página, y la comparación
 * de saldos sigue siendo válida: el saldo final es el del RANGO, y las dos
 * lecturas usan el mismo.
 */
async function abrirMayor(page: Page): Promise<number> {
  const hoy = hoyYMD();
  await page.goto(`/finance/mayor?from=${hoy}&to=${hoy}`);
  await pick(page, 'Cuenta', FINANCE_FIXTURE.mappedAccount);
  const saldo = page
    .getByText('Saldo final', { exact: true })
    .locator('xpath=following-sibling::p');
  await expect(saldo).toBeVisible();

  // Y la página al máximo: acotado a hoy quedan pocas páginas de cien líneas.
  await page.getByRole('combobox').last().click();
  await page.getByRole('option', { name: '100', exact: true }).click();
  await expect(page.locator('table tbody tr').first()).toBeVisible();

  return aNumero(await saldo.innerText());
}

/**
 * Busca una línea del mayor recorriendo sus páginas hacia adelante.
 *
 * Hace falta porque el mayor ordena por FECHA **sin desempate**: dentro del día
 * de hoy la posición del asiento recién creado no está determinada, y esta base
 * acumula una corrida tras otra sobre la misma cuenta. (Es el mismo hueco que el
 * fix round 1 del backend cerró para la lista de movimientos y que en el mayor
 * sigue abierto: ver el concern del reporte.)
 *
 * El avance se espera contra el CONTENIDO de la primera fila y no contra el
 * indicador `n / total`: ese lo pinta el estado local y cambia al instante,
 * mientras `keepPreviousData` deja las filas de la página anterior a la vista.
 */
async function lineaEnMayor(page: Page, texto: string): Promise<Locator> {
  const linea = page.locator('table tbody tr').filter({ hasText: texto });
  const primera = page.locator('table tbody tr').first();
  const siguiente = page.getByRole('button', { name: 'Página siguiente' });

  for (let i = 0; i < 20; i += 1) {
    if ((await linea.count()) > 0) return linea;
    if (!(await siguiente.isEnabled())) break;
    const antes = await primera.innerText();
    await siguiente.click();
    await expect(primera).not.toHaveText(antes);
  }
  return linea;
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
  const linea = await lineaEnMayor(page, vendor);
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
  try {
    await fila.getByRole('button', { name: 'Editar' }).click();
    // El código se lee pero no se cambia.
    await expect(dialog.getByLabel('Código')).toHaveAttribute('readonly', '');
    await dialog.getByLabel('Nombre').fill(renombrada);
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Cuenta actualizada')).toBeVisible();
    await expect(page.getByText(/no se puede cambiar/)).toHaveCount(0);
    await expect(page.locator('table tbody tr').filter({ hasText: renombrada })).toBeVisible();
  } finally {
    // El nombre lo usan los otros specs y una cuenta no se borra: si la assertion
    // de arriba falla, dejar `6900` renombrada rompe la corrida siguiente.
    //
    // Y va dentro de su propio try: una restauración que falla porque el test ya
    // había fallado (la fila renombrada nunca existió) tiraba SU error desde el
    // `finally`, que reemplaza al original — el reporte terminaba culpando al
    // botón "Editar" de un fallo que había ocurrido tres líneas antes.
    try {
      await page
        .locator('table tbody tr')
        .filter({ hasText: renombrada })
        .getByRole('button', { name: 'Editar' })
        .click();
      await dialog.getByLabel('Nombre').fill(original);
      await dialog.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Cuenta actualizada')).toBeVisible();
    } catch (e) {
      console.warn(`No se pudo restaurar el nombre de ${code as string}:`, e);
    }
  }
});

test('la cuenta 1900 es del sistema: se marca en el árbol y no se ofrece retirar', async ({
  page,
}) => {
  const [code] = FINANCE_FIXTURE.systemAccount.split(' ');

  await page.goto('/finance/cuentas');
  const fila = page.locator('table tbody tr').filter({ hasText: code as string });
  await expect(fila).toBeVisible();
  await expect(fila).toContainText('Sistema');

  await fila.getByRole('button', { name: 'Editar' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Nombre')).toBeVisible();
  // Retirarla dejaría al emisor automático sin destino (409 ACCOUNT_IS_SYSTEM):
  // el panel no lo ofrece en vez de dejar que el backend lo rechace.
  await expect(dialog.getByRole('switch', { name: 'Activa' })).toHaveCount(0);
  await expect(dialog.getByText(/no se retira ni recibe subcuentas/)).toBeVisible();
});

test('Play lista las órdenes de Google con su resumen por estado', async ({ page }) => {
  await page.goto('/finance/play');

  // El resumen se pinta con o sin órdenes: es el que dice cuántas necesitan
  // atención, que es la razón de ser de la pantalla.
  const resumen = page.getByRole('group', { name: 'Órdenes por estado' });
  await expect(resumen).toBeVisible();
  await expect(resumen.getByRole('button', { name: /Falló/ })).toBeVisible();

  // La base e2e puede tener órdenes o no: las dos salidas son válidas. Lo que no
  // puede pasar es que la tabla quede muda, ni que diga "no hay órdenes" porque
  // la carga falló.
  const vacio = page.getByText('Todavía no hay órdenes de Google Play registradas');
  const conOrden = page.locator('table tbody tr').filter({ hasText: /Asentada|Pendiente/ });
  await expect(vacio.or(conOrden.first())).toBeVisible();
  await expect(page.getByText('No se pudo cargar')).toHaveCount(0);

  await expect(page.getByRole('combobox', { name: 'Filtrar por estado' })).toBeVisible();
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

// El índice reemplazó a la barra de pestañas (decisión del founder, 2026-09-06):
// es la única navegación de la sección, así que una card rota deja una pantalla
// sin forma de llegar.
const INDEX_CARDS = [
  ['Dashboard', '/finance/dashboard'],
  ['Movimientos', '/finance/movimientos'],
  ['Play', '/finance/play'],
  ['Mayor', '/finance/mayor'],
  ['Comprobación', '/finance/comprobacion'],
  ['Balance general', '/finance/balance'],
  ['Flujo de caja', '/finance/flujo'],
  ['Presupuesto', '/finance/presupuesto'],
  ['KPIs', '/finance/kpis'],
  ['Proyección', '/finance/proyeccion'],
  ['Alertas', '/finance/alertas'],
  ['Impuestos', '/finance/impuestos'],
  ['Cierre mensual', '/finance/cierre'],
  ['Paquete del contador', '/finance/paquete-contador'],
  ['Cuentas', '/finance/cuentas'],
  ['Categorías', '/finance/categorias'],
  ['Tipos de cambio', '/finance/tipos-de-cambio'],
] as const;

test('el índice de Finanzas lleva a las diecisiete pantallas y se vuelve por el breadcrumb', async ({
  page,
}) => {
  await page.goto('/finance');

  // Por href y no por nombre: el sidebar también dice "Dashboard".
  for (const [label, href] of INDEX_CARDS) {
    const card = page.locator(`a[href="${href}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(label);
  }

  await page.locator('a[href="/finance/balance"]').click();
  await expect(page).toHaveURL(/\/finance\/balance$/);
  await expect(page.getByRole('heading', { name: 'Balance general' })).toBeVisible();

  // Y la vuelta: el breadcrumb del shell es el enlace al índice (el sidebar
  // también dice "Finanzas", así que se acota al breadcrumb).
  const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
  await breadcrumb.getByRole('link', { name: 'Finanzas', exact: true }).click();
  await expect(page).toHaveURL(/\/finance$/);
});

// Deja el par CRC→USD sin tasas: el alta choca con 409 EXCHANGE_RATE_EXISTS si ya
// hay una del mismo día, y una corrida anterior interrumpida deja la suya.
async function limpiarTasasCrcUsd(page: Page): Promise<void> {
  await page.goto('/finance/tipos-de-cambio');
  await pick(page, 'Filtrar por moneda de origen', 'CRC');
  await pick(page, 'Filtrar por moneda de destino', 'USD');
  for (let i = 0; i < 20; i += 1) {
    // `exact`: sin él, "Borrar" también matchea el "Borrar tasa" del diálogo de
    // confirmación, y el helper terminaba clickeando el botón de un diálogo que
    // todavía se estaba animando ("element is not stable").
    const borrar = page.locator('table').getByRole('button', { name: 'Borrar', exact: true }).first();
    if (!(await borrar.isVisible().catch(() => false))) return;
    await borrar.click();
    await page.getByRole('button', { name: 'Borrar tasa' }).click();
    await expect(page.getByText('Tipo de cambio borrado')).toBeVisible();
  }
  throw new Error('Quedan tasas CRC→USD después de 20 borrados.');
}

test('el consolidado convierte con la tasa cargada, y sin ella dice N/A', async ({ page }) => {
  // Garantiza que haya plata EN COLONES en el libro: el consolidado solo nombra
  // en `missing` las monedas que aparecen en los datos.
  await crearGasto(page, vendorTag('Consolidado'));
  await limpiarTasasCrcUsd(page);

  // 1 · La tasa se carga a mano, con su fuente.
  await page.getByRole('button', { name: 'Nueva tasa' }).click();
  const alta = page.getByRole('dialog');
  await alta.getByLabel('Tasa').fill('0.002');
  await alta.getByLabel('Fuente').fill(`E2E BCCR ${Date.now()}`);
  await alta.getByRole('button', { name: 'Cargar tasa' }).click();
  await expect(page.getByText('Tipo de cambio cargado')).toBeVisible();
  await expect(page.locator('table tbody tr').filter({ hasText: 'CRC → USD' })).toBeVisible();

  // 2 · El balance por moneda cuadra.
  await page.goto('/finance/balance');
  await expect(page.getByText('Cuadra', { exact: true })).toBeVisible();
  await expect(page.getByText(/No cuadra/)).toHaveCount(0);

  // 3 · Y consolidado a USD también, etiquetado con la tasa que usó.
  await pick(page, 'Moneda', 'Consolidar a USD');
  await expect(page.getByText(/Convertido a USD/)).toBeVisible();
  await expect(page.getByText(/1 CRC = 0\.00200000 USD/)).toBeVisible();
  await expect(page.getByText('Cuadra', { exact: true })).toBeVisible();
  await expect(page.getByText(/N\/A/)).toHaveCount(0);

  // 4 · El flujo de caja lista la caja del plan aunque esté en cero.
  await page.goto('/finance/flujo');
  await expect(
    page.locator('table tbody tr').filter({ hasText: FINANCE_FIXTURE.cashAccount.slice(5) }),
  ).toBeVisible();
  await expect(page.getByText('Totales')).toBeVisible();

  // 5 · Sin tasa, el consolidado dice N/A: no suma con factor 1 ni omite en silencio.
  await limpiarTasasCrcUsd(page);
  await page.goto('/finance/balance');
  await pick(page, 'Moneda', 'Consolidar a USD');
  await expect(page.getByText(/Sin tipo de cambio para: CRC → N\/A/)).toBeVisible();
  await expect(page.getByText(/NO están sumados en ningún total/)).toBeVisible();
});

// ─── Fase 4: presupuesto, variación, KPIs, proyección y alertas ───────────────

// Los mismos que el panel (`finance-format.ts`): "Setiembre", no "Septiembre".
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

const HOY = new Date();
const ANIO_ACTUAL = String(HOY.getFullYear());
const MES_ACTUAL = MESES[HOY.getMonth()] as string;

// El presupuesto del mes es único por (año, mes, moneda) y NO se borra: una
// segunda corrida tiene que reusar el que dejó la primera, o choca con 409
// BUDGET_EXISTS.
const PRESUPUESTO_E2E = 'E2E Presupuesto del mes';
// Un colón: cualquier gasto real del mes lo deja por encima, que es justo lo que
// la variación y la alerta de sobregiro tienen que mostrar.
const MONTO_PRESUPUESTADO = '1.00';

async function filaDelPresupuestoDelMes(page: Page): Promise<Locator> {
  await page.goto('/finance/presupuesto');
  await pick(page, 'Filtrar por año', ANIO_ACTUAL);
  await pick(page, 'Filtrar por mes', MES_ACTUAL);
  await pick(page, 'Filtrar por moneda', 'CRC');
  return page.locator('table tbody tr').filter({ hasText: PRESUPUESTO_E2E });
}

test('el presupuesto del mes se carga por cuenta y la variación lo compara contra el real', async ({
  page,
}) => {
  // Gasto real en `6900` de este mes: sin él la variación no tendría contra qué
  // comparar y el sobregiro no existiría.
  await crearGasto(page, vendorTag('Presupuesto'));

  let fila = await filaDelPresupuestoDelMes(page);
  if ((await fila.count()) === 0) {
    await page.getByRole('button', { name: 'Nuevo presupuesto' }).click();
    const alta = page.getByRole('dialog');
    await alta.getByRole('combobox', { name: 'Año' }).click();
    await page.getByRole('option', { name: ANIO_ACTUAL, exact: true }).click();
    await alta.getByRole('combobox', { name: 'Mes' }).click();
    await page.getByRole('option', { name: MES_ACTUAL, exact: true }).click();
    await alta.getByLabel('Nombre').fill(PRESUPUESTO_E2E);
    await alta.getByRole('button', { name: 'Crear presupuesto' }).click();
    await expect(page.getByText('Presupuesto creado')).toBeVisible();
    fila = await filaDelPresupuestoDelMes(page);
  }
  await expect(fila).toBeVisible();
  // Nace vigente: es el único estado que mira la alerta de sobregiro.
  await expect(fila).toContainText('Vigente');

  // Una línea sobre la cuenta del fixture. Guardar es un reemplazo total.
  await fila.getByRole('button', { name: 'Editar líneas' }).click();
  const editor = page.getByRole('dialog');
  await expect(editor.getByText(PRESUPUESTO_E2E)).toBeVisible();
  await editor
    .getByLabel(`Monto de ${FINANCE_FIXTURE.mappedAccount}`)
    .fill(MONTO_PRESUPUESTADO);
  await editor.getByRole('button', { name: 'Guardar presupuesto' }).click();
  await expect(page.getByText(/Presupuesto guardado/)).toBeVisible();

  // La variación del mismo mes ya compara: presupuesto de 1,00 contra el real.
  const variacion = page
    .locator('[data-slot="card"]')
    .filter({ hasText: 'Presupuesto contra real' });
  await expect(variacion).toBeVisible();
  const linea = variacion.locator('table tbody tr').filter({ hasText: 'Otros gastos operativos' });
  await expect(linea).toBeVisible();
  await expect(linea).toContainText('1,00');
  // Gastar por encima de lo presupuestado juega EN CONTRA: el signo por sí solo
  // no alcanza para decirlo (en un ingreso, el mismo signo sería a favor).
  await expect(linea.getByText('en contra')).toBeAttached();
  await expect(variacion.getByText('Resultado neto')).toBeVisible();
});

test('los KPIs y la pista de caja dicen N/A con motivo, nunca un cero', async ({ page }) => {
  await page.goto('/finance/kpis');
  // Los trece indicadores salen de una consulta que agrega toda la base: sobre
  // `kodi_dev`, que crece con cada corrida, tarda más que los 5 s por defecto de
  // `expect`. Se espera a que los esqueletos se vayan y recién ahí se afirma —un
  // esqueleto no es un N/A, y confundirlos hacía fallar al spec por el reloj.
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 30_000 });

  // El motivo viaja en el nombre accesible del N/A: sin eso, un "N/A" suelto no
  // se distingue de un dato que se perdió.
  const conMotivo = page.getByRole('button', { name: /^N\/A: .+/ });
  await expect(conMotivo.first()).toBeVisible();

  for (const kpi of ['LTV', 'CAC']) {
    const card = page.locator('[data-slot="card"]').filter({ hasText: new RegExp(`^${kpi}`) });
    await expect(card).toBeVisible();
    await expect(card.getByRole('button', { name: /^N\/A: .+/ })).toBeVisible();
    // Un LTV o un CAC en cero se leerían como "nadie se va nunca" y "adquirir un
    // cliente sale gratis": las dos afirmaciones son falsas.
    await expect(card.getByText('0,00 CRC')).toHaveCount(0);
  }

  // La pista de caja vive en Proyección y sigue la misma regla.
  await page.goto('/finance/proyeccion');
  await expect(page.getByText('Meses de pista')).toBeVisible();
  const pista = page.getByText('Meses de pista').locator('..');
  await expect(pista.getByRole('button', { name: /^N\/A: .+/ })).toBeVisible();
  await expect(pista.getByText('0,0 meses')).toHaveCount(0);

  // Y el método de la proyección está a la vista, con la advertencia.
  await expect(page.getByText(/Proyección lineal sobre \d+ meses/)).toBeVisible();
  await expect(page.getByText('No es un dato.')).toBeVisible();
});

test('una regla de alerta se evalúa a mano y el índice de Finanzas avisa lo que nadie vio', async ({
  page,
}) => {
  await page.goto('/finance/alertas');

  // Las dos tablas de la pantalla dicen el mismo nombre de regla: sin acotar a su
  // card, el locator matchea la regla Y su disparo.
  const cardReglas = page.locator('[data-slot="card"]').filter({ hasText: 'Reglas' });
  const cardAlertas = page.locator('[data-slot="card"]').filter({ hasText: 'Alertas disparadas' });

  // Idempotente: la regla no se borra sola entre corridas. Se espera a que la
  // tabla termine de cargar antes de contar, o cada corrida crearía una copia.
  await expect(cardReglas.locator('[data-slot="skeleton"]')).toHaveCount(0);
  const regla = cardReglas
    .locator('table tbody tr')
    .filter({ hasText: 'Gasto sobre el presupuesto' })
    .first();
  if ((await regla.count()) === 0) {
    await page.getByRole('button', { name: 'Nueva regla' }).click();
    const alta = page.getByRole('dialog');
    await alta.getByRole('combobox', { name: 'Tipo' }).click();
    await page.getByRole('option', { name: /Gasto sobre el presupuesto/ }).click();
    // Cualquier peso por encima del presupuesto del mes.
    await alta.getByLabel('Umbral').fill('0');
    await alta.getByRole('button', { name: 'Crear regla' }).click();
    await expect(page.getByText('Regla creada')).toBeVisible();
  }
  await expect(regla).toBeVisible();
  await expect(regla).toContainText('0,00 %');

  // Evaluar a mano corre el mismo evaluador que el cron diario.
  await page.getByRole('button', { name: 'Evaluar ahora' }).click();
  await expect(page.getByText(/regla\(s\) evaluadas el \d{4}-\d{2}-\d{2}/)).toBeVisible();

  // El disparo queda listado, sin ver.
  const alerta = cardAlertas
    .locator('table tbody tr')
    .filter({ hasText: 'Gasto sobre el presupuesto' })
    .filter({ has: page.getByRole('button', { name: 'Marcar como vista' }) });
  await expect(alerta.first()).toBeVisible();

  // Y el índice de la sección lo dice: sin correo a admins, este banner ES el
  // canal, y una alerta que solo vive en su pantalla no la ve nadie.
  await page.goto('/finance');
  await expect(page.getByText(/alerta(s)? financiera(s)? sin ver/)).toBeVisible();
  await page.getByRole('link', { name: 'Ver alertas' }).click();
  await expect(page).toHaveURL(/\/finance\/alertas$/);
});

// ─── Fase 5: impuestos, cierre mensual y paquete del contador ────────────────

test('las tarifas de impuesto muestran la que rige, con su vigencia', async ({ page }) => {
  await page.goto('/finance/impuestos');

  // `IVA_CR` la siembra `seedTaxRules` en el globalSetup: sin una tarifa vigente
  // para facturas de sponsor, emitir una factura con IVA responde 409.
  const fila = page.locator('table tbody tr').filter({ hasText: 'IVA_CR' }).first();
  await expect(fila).toBeVisible();
  await expect(fila).toContainText('13,00 %');
  // La fracción exacta al lado del por ciento: es la que el backend valida.
  await expect(fila).toContainText('0.1300');
  await expect(fila).toContainText('2019-07-01');
  await expect(fila).toContainText('Activa');
});

test('la declaración del mes se crea del mayor y pasa a revisión', async ({ page }) => {
  await page.goto('/finance/impuestos');
  await page.getByRole('tab', { name: 'Declaraciones de IVA' }).click();

  const hoy = new Date();
  const periodo = `${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

  // Idempotente: la declaración es única por (año, mes, tipo). Una segunda
  // corrida del mismo mes choca con 409, así que se reusa la que ya está —pero
  // hay que esperar a que la tabla termine de cargar antes de contar, o el
  // reintento crea una copia que el backend rechaza.
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  const fila = page.locator('table tbody tr').filter({ hasText: periodo }).first();
  if ((await fila.count()) === 0) {
    await page.getByRole('button', { name: /Nueva declaración/ }).click();
    const alta = page.getByRole('dialog');
    await alta.getByRole('button', { name: /Crear declaración/ }).click();
    await expect(page.getByText('Declaración creada')).toBeVisible();
  }
  await expect(fila).toBeVisible();

  await fila.getByRole('button', { name: 'Ver detalle' }).click();
  const detalle = page.getByRole('dialog').first();

  // El literal del backend, tal cual: el IVA de las compras no se modela y el
  // contador tiene que verlo antes de usar la cifra.
  await expect(detalle.getByText('IVA soportado (compras): N/A')).toBeVisible();
  await expect(
    detalle.getByText('IVA soportado no modelado en esta versión; el contador lo agrega a mano'),
  ).toBeVisible();
  await expect(detalle.getByText('IVA repercutido (cobrado)')).toBeVisible();

  // Y las transiciones son las del estado, no todas: desde borrador solo se
  // puede ir a revisión.
  const enBorrador = await detalle.getByRole('button', { name: 'Pasar a revisión' }).count();
  if (enBorrador > 0) {
    await detalle.getByRole('button', { name: 'Pasar a revisión' }).click();
    const confirmar = page.getByRole('dialog').last();
    await confirmar.getByRole('button', { name: 'Pasar a revisión' }).click();
    await expect(page.getByText('Declaración en En revisión')).toBeVisible();
  }
  await expect(page.locator('table tbody tr').filter({ hasText: periodo }).first()).toContainText(
    'En revisión',
  );
});

test('el cierre mensual dice qué falta, y lo cerrado se reabre con motivo', async ({ page }) => {
  await page.goto('/finance/cierre');

  const hoy = new Date();
  const periodo = `${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  const fila = page.locator('table tbody tr').filter({ hasText: periodo }).first();
  await expect(fila).toBeVisible();

  const cerrar = fila.getByRole('button', { name: /^Cerrar/ });
  if (await cerrar.isDisabled()) {
    // Con un bloqueo no forzable el botón queda apagado Y el motivo se lee en la
    // fila: el tooltip es el segundo canal, nunca el único.
    await expect(fila.getByRole('listitem').first()).toBeVisible();
    return;
  }

  await cerrar.click();
  const cierre = page.getByRole('dialog');
  const motivoDelCierre = cierre.getByLabel('Motivo');
  if ((await motivoDelCierre.count()) > 0) {
    await motivoDelCierre.fill('Cierre forzado por el e2e: las órdenes de Play siguen en cola.');
  }
  await cierre.getByRole('button', { name: /^Cerrar/ }).click();
  await expect(page.getByText(/cerrado$/)).toBeVisible();
  await expect(fila).toContainText('Cerrado');

  // Y se reabre en el acto: dejar el mes cerrado bloquearía todo asiento con
  // fecha de hoy para el resto de la suite.
  await fila.getByRole('button', { name: 'Reabrir' }).click();
  const reapertura = page.getByRole('dialog');
  const confirmarReapertura = reapertura.getByRole('button', { name: 'Reabrir período' });
  await expect(confirmarReapertura).toBeDisabled();
  await reapertura.getByLabel('Motivo').fill('Reapertura del e2e: el mes tiene que seguir abierto.');
  await confirmarReapertura.click();

  await expect(page.getByText(/reabierto$/)).toBeVisible();
  await expect(fila).toContainText('Abierto');
});

test('el paquete del contador se genera y queda listo para descargar', async ({ page }) => {
  await page.goto('/finance/paquete-contador');

  // El selector arranca en el mes ANTERIOR, que es el que se le manda al
  // contador. No se cambia: el mes en curso todavía se mueve.
  const versiones = page.locator('[data-slot="card"]').filter({ hasText: /^Versión/ });
  // Contar mientras la lista está en su esqueleto da 0 y desalinea todo lo que
  // sigue: primero se espera a que termine de cargar.
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  const antes = await versiones.count();

  // La generación es SINCRÓNICA (arma el PDF, los cuatro CSV y los sube a R2):
  // se espera a la versión nueva y no al toast, que el de una corrida anterior
  // puede seguir en pantalla.
  await page.getByRole('button', { name: /Generar paquete/ }).click();
  await expect(versiones).toHaveCount(antes + 1, { timeout: 120_000 });

  // La más nueva va primero, lista y con sus cinco archivos.
  const version = versiones.first();
  await expect(version.getByText('Listo')).toBeVisible();
  for (const archivo of [
    'PDF completo',
    'Mayor (CSV)',
    'Comprobación (CSV)',
    'Balance general (CSV)',
    'Resultados (CSV)',
  ]) {
    // El nombre va como string y no como RegExp: los paréntesis de "(CSV)"
    // serían un grupo de captura y matchearían "Mayor CSV", que no existe.
    await expect(version.getByRole('button', { name: archivo })).toBeVisible();
  }

  // Regenerar NO pisa: nace una versión más y la anterior sigue descargable.
  await page.getByRole('button', { name: /Generar paquete/ }).click();
  await expect(versiones).toHaveCount(antes + 2, { timeout: 120_000 });
  await expect(versiones.nth(1).getByText('Listo')).toBeVisible();
});
