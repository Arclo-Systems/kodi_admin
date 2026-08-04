import { describe, expect, it } from 'vitest';
import { toInput, toValues } from './coupon-form';
import type { CouponDetail } from '@/hooks/use-coupons';

const detail: CouponDetail = {
  id: 'c1',
  sponsorId: 's1',
  title: '2x1 en café',
  description: 'Solo en sucursales participantes',
  tier: 'basico',
  kolonesCost: 120,
  country: 'CR',
  moduleId: null,
  isProExclusive: false,
  isFeatured: true,
  stockTotal: null,
  stockRemaining: null,
  validUntil: '2026-12-31T00:00:00.000Z',
  isActive: true,
  codePrefix: 'KOD',
  codeSuffixLen: 8,
  limitPerUser: 1,
  createdBy: null,
  updatedBy: null,
  category: 'academico',
  conditions: ['No acumulable'],
  validDaysAfterRedeem: 30,
  updatedAt: '2026-08-01T12:00:00.000Z',
  sponsor: { name: 'Café Kodi', logoUrl: null },
  couponBranches: [],
};

// La fecha viaja como día suelto en el form (YYYY-MM-DD) y como ISO en la API.
// Si alguien pasa la serialización a hora local (new Date('2026-12-31')), el día
// se corre y el cupón vence 24h antes o después de lo que puso el admin.
describe('CouponForm — round-trip de validUntil', () => {
  it('deserializa el ISO al día suelto sin correrlo', () => {
    expect(toValues(detail).validUntil).toBe('2026-12-31');
  });

  it('serializa el día suelto a medianoche UTC', () => {
    expect(toInput(toValues(detail), []).validUntil).toBe('2026-12-31T00:00:00.000Z');
  });

  it('sobrevive el ida y vuelta completo', () => {
    const once = toInput(toValues(detail), detail.conditions).validUntil;
    expect(once).toBe(detail.validUntil);
    expect(toInput(toValues({ ...detail, validUntil: once }), []).validUntil).toBe(once);
  });

  it('sin vencimiento ↔ null', () => {
    expect(toValues({ ...detail, validUntil: null }).validUntil).toBe('');
    expect(toInput(toValues({ ...detail, validUntil: null }), []).validUntil).toBeNull();
  });
});

describe('CouponForm — el destacado sobrevive el round-trip', () => {
  it('mantiene isFeatured en true', () => {
    expect(toValues(detail).isFeatured).toBe(true);
    expect(toInput(toValues(detail), []).isFeatured).toBe(true);
  });

  it('mantiene isFeatured en false', () => {
    const off = { ...detail, isFeatured: false };
    expect(toInput(toValues(off), []).isFeatured).toBe(false);
  });
});
