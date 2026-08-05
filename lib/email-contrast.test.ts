import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  ctaContrastRatio,
  ctaShadowColor,
  CTA_SHADOW_DARKEN,
  darkenHex,
  hasReadableCtaContrast,
  isHexColor,
  MIN_CTA_CONTRAST,
} from './email-contrast';

// Espejo de `email/templates/brand-colors.spec.ts` del backend. Las dos
// implementaciones tienen que dar el MISMO veredicto: si divergen, el panel
// deja guardar un color que el PUT rechaza con 422 (o al revés, bloquea uno
// válido). Los anclajes de abajo son los mismos del backend.
const WHITE = '#FFFFFF';

describe('isHexColor', () => {
  it('acepta solo hex de 6 dígitos con #', () => {
    expect(isHexColor('#408D99')).toBe(true);
    expect(isHexColor('#408d99')).toBe(true);
    expect(isHexColor('#408')).toBe(false);
    expect(isHexColor('408D99')).toBe(false);
    expect(isHexColor('rgb(64,141,153)')).toBe(false);
  });
});

describe('contrastRatio', () => {
  it('da 21 para negro sobre blanco', () => {
    expect(contrastRatio('#000000', WHITE)).toBeCloseTo(21, 2);
  });

  it('da 1 para un color contra sí mismo', () => {
    expect(contrastRatio('#408D99', '#408D99')).toBeCloseTo(1, 5);
  });

  it('es simétrico', () => {
    expect(contrastRatio('#408D99', WHITE)).toBeCloseTo(contrastRatio(WHITE, '#408D99'), 6);
  });
});

describe('hasReadableCtaContrast', () => {
  it('acepta el teal de marca (el CTA que está en producción hoy)', () => {
    expect(hasReadableCtaContrast('#408D99')).toBe(true);
  });

  it('rechaza un color pálido donde el texto blanco desaparece', () => {
    expect(hasReadableCtaContrast('#FFE066')).toBe(false);
    expect(hasReadableCtaContrast(WHITE)).toBe(false);
  });

  it('acepta fondos casi negros', () => {
    expect(hasReadableCtaContrast('#171717')).toBe(true);
  });

  // El límite exacto: un gris más y el mismo color pasa de válido a 422. Es el
  // punto donde un redondeo distinto entre panel y backend se notaría.
  it('corta en el umbral: #949494 pasa, #959595 no', () => {
    expect(ctaContrastRatio('#949494')).toBeGreaterThanOrEqual(MIN_CTA_CONTRAST);
    expect(hasReadableCtaContrast('#949494')).toBe(true);

    expect(ctaContrastRatio('#959595')).toBeLessThan(MIN_CTA_CONTRAST);
    expect(hasReadableCtaContrast('#959595')).toBe(false);
  });
});

// Sombra 3D del CTA. El preview del composer la pinta con esta función; si el
// cálculo diverge del backend, el admin elige un color mirando una sombra que
// el correo no va a tener. Los valores son los del backend, verificados canal
// por canal (round(canal × 0.82)) — no salen de correr esta implementación.
describe('darkenHex', () => {
  it('coincide con el anclaje del backend para el teal de marca', () => {
    // 0x40→52 (0x34) · 0x8D→116 (0x74) · 0x99→125 (0x7D)
    expect(darkenHex('#408D99', CTA_SHADOW_DARKEN)).toBe('#34747D');
  });

  it('oscurece cada canal por separado', () => {
    // 0x12→15 (0x0F) · 0x34→43 (0x2B) · 0x56→71 (0x47)
    expect(darkenHex('#123456', CTA_SHADOW_DARKEN)).toBe('#0F2B47');
    // 0xFF→209 (0xD1); los canales en cero se quedan en cero
    expect(darkenHex('#FF0000', CTA_SHADOW_DARKEN)).toBe('#D10000');
  });

  it('normaliza a mayúsculas (el backend interpola el hex tal cual en el style)', () => {
    // 0xAB→140 (0x8C) · 0xCD→168 (0xA8) · 0xEF→196 (0xC4)
    expect(darkenHex('#abcdef', CTA_SHADOW_DARKEN)).toBe('#8CA8C4');
  });

  it('respeta los extremos: 0 no toca nada, 1 lleva a negro', () => {
    expect(darkenHex('#123456', 0)).toBe('#123456');
    expect(darkenHex('#FFFFFF', 1)).toBe('#000000');
    expect(darkenHex('#000000', 0.5)).toBe('#000000');
  });

  it('usa el mismo factor que el backend', () => {
    expect(CTA_SHADOW_DARKEN).toBe(0.18);
  });
});

describe('ctaShadowColor', () => {
  const DEFAULT_CTA = '#408D99';

  it('el par por defecto NO se deriva: usa la sombra afinada a mano', () => {
    expect(ctaShadowColor(DEFAULT_CTA, DEFAULT_CTA)).toBe('#2F6F7A');
  });

  it('reconoce el default aunque venga en minúsculas', () => {
    expect(ctaShadowColor('#408d99', DEFAULT_CTA)).toBe('#2F6F7A');
  });

  it('un color elegido por el admin sí deriva su sombra', () => {
    // 0xFF→209 (0xD1) · 0x6B→88 (0x58) · 0x35→43 (0x2B)
    expect(ctaShadowColor('#FF6B35', DEFAULT_CTA)).toBe('#D1582B');
  });

  it('un color que casualmente es el default de otro deploy también deriva', () => {
    expect(ctaShadowColor('#408D99', '#171717')).toBe('#34747D');
  });
});
