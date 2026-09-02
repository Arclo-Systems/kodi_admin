// La fecha de un movimiento de finanzas es un DÍA CIVIL ("el gasto del 31 de julio"), no un
// instante: tiene que seguir siendo el 31 de julio se mire desde donde se mire.
//
// El backend la guarda en una columna `timestamptz` (`FinanceEntry.date`), así que el día civil
// viaja obligadamente anclado a una hora del día, y esa hora es la que decide si el día se corre.
// Se ancla a MEDIODÍA UTC porque medianoche UTC es el mismo instante que las 18:00 del día
// anterior en Costa Rica (UTC−6): un gasto cargado el 31/7 se guardaba como `2026-07-31T00:00:00Z`
// y la tabla, que formatea en la hora del navegador, lo pintaba 30/7.
//
// El ancla va en el guardado y no en el render a propósito: el instante guardado no lo consume
// solo la tabla, también el P&L del backend (que bucketiza el mes cortando el ISO en UTC) y el
// prefill del formulario. Corregir solo el formato dejaría el dato guardado significando el día
// anterior para todos los demás. Anclar a mediodía deja a los tres leyendo el mismo día.
//
// Margen: ±12 h, así que el día no se corre en ninguna zona de UTC−12 a UTC+11 — toda la banda
// desde la que se opera el panel (CR) y a la que apunta la expansión (CO/MX/CL/España). De UTC+12
// en adelante (Nueva Zelanda, Kiribati) sí correría: ningún instante único puede cubrir las 26 h
// de husos que existen, y mediodía es el ancla que maximiza el margen a ambos lados.

const CIVIL_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `'2026-07-31'` → `'2026-07-31T12:00:00.000Z'`, listo para mandar al backend. */
export function civilDayToIso(day: string): string {
  if (!CIVIL_DAY.test(day)) throw new Error(`Día civil inválido: ${day}`);
  return `${day}T12:00:00.000Z`;
}

/** Inversa de `civilDayToIso`: el día civil del ISO que devuelve el backend, leído en UTC. */
export function isoToCivilDay(iso: string): string {
  return iso.slice(0, 10);
}

// Los rangos de fecha viajan como día civil suelto y el backend los parsea con `new Date(s)`, que
// para un `YYYY-MM-DD` da medianoche UTC. Como el corte superior es `lte`, mandar el día pelado
// deja afuera el último día del rango salvo lo que caiga exacto en su medianoche. Se mandan los
// dos bordes explícitos para que el rango cubra los dos días completos.
export function civilDayStartIso(day: string): string {
  if (!CIVIL_DAY.test(day)) throw new Error(`Día civil inválido: ${day}`);
  return `${day}T00:00:00.000Z`;
}

export function civilDayEndIso(day: string): string {
  if (!CIVIL_DAY.test(day)) throw new Error(`Día civil inválido: ${day}`);
  return `${day}T23:59:59.999Z`;
}

// El resto del panel tiene el mismo problema de día corrido pero al revés: son campos cuyo
// instante guardado YA es el día civil a medianoche UTC y no se puede cambiar, sea porque la
// columna es `@db.Date` y Postgres trunca la hora (cupones, snapshots de bots), sea porque
// moverla cambiaría comportamiento (el cron que marca facturas vencidas corre a las 08:00Z).
// Ahí el que miente es el render: `toLocaleDateString()` lo pinta con el reloj del navegador y
// en CR (UTC−6) medianoche UTC cae a las 18:00 del día anterior. Leerlo de vuelta en UTC es
// exactamente la inversa de cómo se guardó, así que corrige las filas viejas y las nuevas sin
// migrar un solo dato.
//
// OJO: no sirve para fechas que se guardaron con bordes LOCALES (el patrocinio de universidades
// guarda `T00:00:00` y `T23:59:59.999` en hora local); esas ya son consistentes con el formato
// local y leerlas en UTC las correría un día para el otro lado.
export function formatCivilDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CR', { timeZone: 'UTC' });
}
