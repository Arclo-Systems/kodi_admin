import { describe, expect, it } from 'vitest';
import { FormSchema } from './promo-offers-manager';
import { FormSchema as KokosFormSchema } from '../kokos-packs/kokos-packs-manager';

// La regresión concreta (founder 2026-08-03): al editar la Oferta Fundador en
// modo tabla propia, discountPercent viaja como NaN (sentinel del repo para
// "sin valor") y zod 4 rechaza NaN en z.number(). El error caía en un campo
// que NO se renderiza en ese modo, así que "Guardar" moría en silencio y la
// oferta no se podía encender.
describe('FormSchema de ofertas — sentinel NaN', () => {
  const base = {
    slug: 'founder-cr',
    label: 'Oferta Fundador',
    country: 'CR',
    currency: 'USD' as const,
    slotsTotal: 500,
    startsAt: '',
    endsAt: '',
    badgeItemId: 'NONE',
    isActive: true,
  };

  it('modo tabla propia con NaN de porcentaje → el form ES válido', () => {
    const r = FormSchema.safeParse({
      ...base,
      priceMode: 'explicit',
      discountPercent: NaN,
    });
    expect(r.success).toBe(true);
  });

  it('modo % con NaN → inválido, y el error apunta al campo VISIBLE', () => {
    const r = FormSchema.safeParse({
      ...base,
      priceMode: 'percent',
      discountPercent: NaN,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['discountPercent']);
    }
  });

  it('modo % con porcentaje real → válido', () => {
    const r = FormSchema.safeParse({
      ...base,
      priceMode: 'percent',
      discountPercent: 30,
    });
    expect(r.success).toBe(true);
  });
});

describe('FormSchema de kokos-packs — mismo sentinel NaN en offerUsd', () => {
  it('pack sin oferta (offerUsd NaN) → el form ES válido', () => {
    const r = KokosFormSchema.safeParse({
      slug: 'pack-100',
      name: 'Pack 100',
      amount: 100,
      storeProductId: 'kokos_100',
      priceUsd: 0.99,
      offerUsd: NaN,
      offerStarts: '',
      offerEnds: '',
      isActive: true,
      sortOrder: 0,
    });
    expect(r.success).toBe(true);
  });
});
