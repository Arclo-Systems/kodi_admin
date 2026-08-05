// Espejo del chequeo de contraste del backend (`email/templates/brand-colors.ts`).
// El backend es la frontera real y responde 422; esto solo evita que el admin
// descubra el problema recién al apretar Guardar.

const HEX_6 = /^#[0-9a-fA-F]{6}$/;

const WHITE = '#FFFFFF';

/** Umbral WCAG AA para texto grande/bold, que es exactamente lo que es la píldora del CTA. */
export const MIN_CTA_CONTRAST = 3;

export function isHexColor(value: string): boolean {
  return HEX_6.test(value);
}

/** Razón de contraste WCAG entre dos colores hex (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** ¿El texto blanco del botón se lee sobre este fondo? */
export function hasReadableCtaContrast(background: string): boolean {
  return contrastRatio(background, WHITE) >= MIN_CTA_CONTRAST;
}

export function ctaContrastRatio(background: string): number {
  return contrastRatio(background, WHITE);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [lr, lg, lb] = [r ?? 0, g ?? 0, b ?? 0].map(toLinearChannel);
  return 0.2126 * (lr ?? 0) + 0.7152 * (lg ?? 0) + 0.0722 * (lb ?? 0);
}

function toLinearChannel(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
