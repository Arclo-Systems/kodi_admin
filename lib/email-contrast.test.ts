import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  ctaContrastRatio,
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
