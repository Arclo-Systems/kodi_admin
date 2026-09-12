/**
 * Cómo se LEE un tipo de cambio, y cuándo está cargado al revés.
 *
 * Una tasa significa "1 `from` = rate `to`". Cargar 458 en el par CRC→USD (que
 * son colones por dólar, la dirección contraria) es un número válido que nadie
 * nota hasta que el consolidado muestra gastos de 465 millones de dólares: pasó
 * en producción. El backend lo rechaza con 400; esto es lo que hace que quien
 * carga lo vea antes de enviar, y la misma regla para no discutirle al servidor.
 *
 * Es la paridad de `backend/src/modules/admin/finance/accounting/
 * exchange-rate-direction.util.ts`.
 */

const USD = 'USD';
// La misma banda que el backend: ninguna tasa legítima de las ocho monedas del
// enum (USD, CRC, GTQ, HNL, PAB, MXN, CLP, ARS) la cruza —la más ajustada es el
// balboa, 1 en las dos direcciones—, así que fuera de ella solo puede estar el
// par invertido. No valida que la tasa sea correcta, solo que no esté al revés.
const MAXIMO_HACIA_USD = 100;
const MINIMO_DESDE_USD = 0.01;

export interface RateReading {
  /** `1 CRC = 0.00218 USD` — el par tal como se está cargando. */
  forward: string;
  /** `1 USD = 458.72 CRC` — el mismo número leído al revés. */
  inverse: string;
  /** Por qué la tasa parece invertida, o `null` si es plausible. */
  warning: string | null;
}

export function isReversedRate(params: {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}): boolean {
  const { fromCurrency, toCurrency, rate } = params;
  if (!Number.isFinite(rate) || rate <= 0) return false;
  return (
    (toCurrency === USD && rate > MAXIMO_HACIA_USD) ||
    (fromCurrency === USD && rate < MINIMO_DESDE_USD)
  );
}

/**
 * Las dos lecturas de la tasa tecleada, o `null` cuando todavía no hay un número
 * usable (vacío, a medio escribir, cero): una vista previa inventada sobre un
 * valor que no existe es peor que ninguna.
 *
 * `rate` se pasa por `Number` a propósito y solo acá: es texto de presentación,
 * no el valor que viaja al backend (ese es el string tecleado, intacto).
 */
export function readRateDirection(params: {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
}): RateReading | null {
  const { fromCurrency, toCurrency } = params;
  const typed = params.rate.trim();
  const rate = Number(typed);
  if (typed === '' || !Number.isFinite(rate) || rate <= 0) return null;
  if (fromCurrency === toCurrency) return null;

  const inverse = formatRate(1 / rate);
  return {
    forward: `1 ${fromCurrency} = ${typed} ${toCurrency}`,
    inverse: `1 ${toCurrency} = ${inverse} ${fromCurrency}`,
    warning: isReversedRate({ fromCurrency, toCurrency, rate })
      ? `${typed} parece la tasa del par al revés (1 ${toCurrency} = ${typed} ${fromCurrency}). ` +
        `Para ${fromCurrency}→${toCurrency} cargá ${inverse} (1/${typed}), ` +
        `o registrá el par ${toCurrency}→${fromCurrency} con ${typed}.`
      : null,
  };
}

/** Dos decimales de 1 para arriba, ocho para abajo: `0.00` no dice nada de 1/458. */
function formatRate(value: number): string {
  const fixed = value >= 1 ? value.toFixed(2) : value.toFixed(8);
  return fixed.includes('.') ? fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : fixed;
}
