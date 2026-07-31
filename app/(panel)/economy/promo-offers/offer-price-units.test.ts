import { describe, expect, it } from 'vitest';
import { fromPriceCents, toPriceCents } from './offer-price-units';

describe('unidades de precio de oferta', () => {
  it('guarda en céntimos lo que se escribe como se lee', () => {
    expect(toPriceCents('4.99')).toBe(499);
    expect(toPriceCents('2500')).toBe(250000);
    expect(toPriceCents('0')).toBe(0);
  });

  // La regresión concreta: antes "3190" se guardaba tal cual y la app lo leía
  // como céntimos → $31.90. Ahora significa 3190 unidades = 319000 céntimos.
  it('3190 significa tres mil ciento noventa, no treinta y uno con noventa', () => {
    expect(toPriceCents('3190')).toBe(319000);
    expect(toPriceCents('3190')).not.toBe(3190);
  });

  it('acepta decimales: el precio se escribe como se lee', () => {
    expect(toPriceCents('4.99')).toBe(499);
    expect(toPriceCents('19.90')).toBe(1990);
  });

  it('rechaza lo que no es un precio', () => {
    expect(toPriceCents('')).toBeNull();
    expect(toPriceCents('  ')).toBeNull();
    expect(toPriceCents('-1')).toBeNull();
    expect(toPriceCents('abc')).toBeNull();
  });

  it('ida y vuelta sin perder el valor', () => {
    for (const escrito of ['4.99', '2500', '0.5', '106790']) {
      expect(fromPriceCents(toPriceCents(escrito)!)).toBe(String(Number(escrito)));
    }
  });
});
