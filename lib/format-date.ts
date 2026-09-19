// Formateador único de instantes del panel.
//
// El panel lo opera Kodi desde Costa Rica: el negocio se lee en hora de CR, no en la del
// navegador ni en la del servidor. Fijar la zona no es cosmético, corrige un bug real: las
// páginas del panel que son Server Components corren en Vercel, cuyo reloj es UTC, así que un
// `toLocaleString()` sin `timeZone` ahí pinta hora UTC — seis horas adelante — y una fila
// de la noche en CR aparece con la fecha del día siguiente. La misma columna se veía distinta
// según si la pantalla que la mostraba era servidor o cliente.
//
// Para el día civil de finanzas y de las columnas `@db.Date` la respuesta NO es esta: ver
// `lib/civil-date.ts`, que lee en UTC a propósito.

export const PANEL_TIME_ZONE = 'America/Costa_Rica';

const PANEL_LOCALE = 'es-CR';

/** Lo que se muestra cuando no hay instante o no es parseable. */
const EMPTY = '—';

/** Todo lo que el panel recibe como instante: ISO del backend, epoch ms de BullMQ o `Date`. */
export type Instant = string | number | Date | null | undefined;

const DATE_FIELDS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
};

const DATE_TIME_FIELDS: Intl.DateTimeFormatOptions = {
  ...DATE_FIELDS,
  hour: '2-digit',
  minute: '2-digit',
};

function toDate(value: Instant): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Las opciones de quien llama REEMPLAZAN al default, no se fusionan: así se puede pedir tanto
// una variante más larga (`dateStyle: 'long'`) como una más corta (solo la hora) sin que `Intl`
// lance por mezclar `dateStyle` con campos sueltos.
function format(
  value: Instant,
  defaults: Intl.DateTimeFormatOptions,
  options: Intl.DateTimeFormatOptions | undefined,
): string {
  const date = toDate(value);
  if (date === null) return EMPTY;
  return new Intl.DateTimeFormat(PANEL_LOCALE, {
    // El reloj de 24 h es el que venía mostrando el panel y el que se lee sin ambigüedad en una
    // tabla; `es-CR` por defecto usa 12 h con "p. m.".
    hourCycle: 'h23',
    ...(options ?? defaults),
    // Va al final a propósito: la zona del panel no es negociable por quien llama.
    timeZone: PANEL_TIME_ZONE,
  }).format(date);
}

/** Día del instante en hora de Costa Rica: `'19/9/2026'`. */
export function formatDate(value: Instant, options?: Intl.DateTimeFormatOptions): string {
  return format(value, DATE_FIELDS, options);
}

/** Día y hora del instante en hora de Costa Rica: `'19/9/2026, 07:00'`. */
export function formatDateTime(value: Instant, options?: Intl.DateTimeFormatOptions): string {
  return format(value, DATE_TIME_FIELDS, options);
}
