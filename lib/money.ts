// Formato de dinero del panel. Paridad con lo que ve el estudiante en la app
// (`frontend/src/lib/api/dto/pricing.ts` + `components/planes/pricing.ts`):
// los importes viajan SIEMPRE en céntimos y la moneda decide símbolo y decimales.

const SYMBOLS: Record<string, string> = {
  CRC: '₡',
  USD: '$',
  GTQ: 'Q',
  HNL: 'L',
  PAB: 'B/.',
};

// El colón se cotiza en miles y sus céntimos no se usan; el dólar y el balboa sí,
// y ahí redondear a entero convertía 4,99 en 5.
const DECIMALS: Record<string, number> = {
  CRC: 0,
  USD: 2,
  GTQ: 2,
  HNL: 2,
  PAB: 2,
};

// El dólar agrupa con coma ($4,999.00); las monedas de la región, con punto (₡2.500).
//
// Se separa a mano en vez de con Intl a propósito: el ICU de `es-CR` agrupa con
// espacio duro (₡1 990), no con punto, y además la versión de ICU cambia entre
// el Node de Vercel y el navegador. El mismo motivo por el que la app formatea a
// mano en `frontend/src/components/planes/pricing.ts`.
type GroupStyle = { group: string; decimal: string };
const LATAM_STYLE: GroupStyle = { group: '.', decimal: ',' };
const STYLES: Record<string, GroupStyle> = { USD: { group: ',', decimal: '.' } };

/** Símbolo de la moneda; una desconocida cae al código ISO como prefijo. */
export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? `${currency} `;
}

export function currencyDecimals(currency: string): number {
  return DECIMALS[currency] ?? 2;
}

/** `formatMoney(250000, 'CRC')` → `₡2.500`; `formatMoney(499, 'USD')` → `$4.99`. */
export function formatMoney(cents: number, currency: string): string {
  const decimals = currencyDecimals(currency);
  const { group, decimal } = STYLES[currency] ?? LATAM_STYLE;
  const scale = 10 ** decimals;
  const rounded = Math.round(Math.abs(cents) / 10 ** (2 - decimals));
  const units = String(Math.trunc(rounded / scale)).replace(/\B(?=(\d{3})+(?!\d))/g, group);
  const fraction = decimals === 0 ? '' : `${decimal}${String(rounded % scale).padStart(decimals, '0')}`;
  return `${cents < 0 ? '-' : ''}${currencySymbol(currency)}${units}${fraction}`;
}
