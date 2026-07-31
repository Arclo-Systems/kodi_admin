// El precio se escribe COMO SE LEE (4.99, 2500) y se guarda en céntimos.
//
// Incidente 2026-07-30: esta grilla guardaba el número crudo mientras la
// pantalla de Precios de suscripción sí multiplicaba por 100. La oferta
// founder-cr quedó con "3190" queriendo decir ₡3.190 y la app —que lee
// céntimos— le mostró $31.90 al estudiante contra $4.99 del precio normal.

/** `null` si el texto no es un precio válido. */
export function toPriceCents(raw: string): number | null {
  const n = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function fromPriceCents(cents: number): string {
  return String(cents / 100);
}
