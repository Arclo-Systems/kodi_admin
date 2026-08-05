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

/** Cuánto se oscurece un CTA configurado para obtener su sombra 3D. */
export const CTA_SHADOW_DARKEN = 0.18;

// El par teal/sombra por defecto está afinado a mano en el backend
// (`DEFAULT_CTA_SHADOW_COLOR`) y NO se deriva: no sale por el GET de brand, así
// que es el único hex que el panel tiene que duplicar. El test espejo lo fija.
const DEFAULT_CTA_SHADOW_COLOR = '#2F6F7A';

/** Oscurece un hex multiplicando cada canal (0.18 = 18% más oscuro). */
export function darkenHex(hex: string, amount: number): string {
  const factor = 1 - amount;
  const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) * factor);
  return `#${channels.map(channelToHex).join('')}`.toUpperCase();
}

/**
 * Sombra 3D del botón — espejo de `resolveCtaShadow` del backend.
 *
 * El default NO se deriva a propósito (derivarlo movería unos puntos la sombra
 * que hoy sale en producción): solo un color ELEGIDO por el admin se oscurece.
 * `defaultCtaColor` llega del GET de brand para no duplicar el teal acá.
 */
export function ctaShadowColor(ctaColor: string, defaultCtaColor: string): string {
  return ctaColor.toUpperCase() === defaultCtaColor.toUpperCase()
    ? DEFAULT_CTA_SHADOW_COLOR
    : darkenHex(ctaColor, CTA_SHADOW_DARKEN);
}

function channelToHex(channel: number): string {
  const clamped = Math.min(255, Math.max(0, Math.round(channel)));
  return clamped.toString(16).padStart(2, '0');
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
