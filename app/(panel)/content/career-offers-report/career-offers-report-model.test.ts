import { describe, expect, it } from 'vitest';
import { ctrLabel, lastDays } from './career-offers-report-model';

describe('rango por defecto', () => {
  it('los últimos 30 días incluyen hoy', () => {
    expect(lastDays(30, new Date(2026, 7, 17))).toEqual({ from: '2026-07-19', to: '2026-08-17' });
  });

  it('cruza el cambio de mes y de año', () => {
    expect(lastDays(7, new Date(2027, 0, 3))).toEqual({ from: '2026-12-28', to: '2027-01-03' });
  });

  it('un día es hoy contra hoy', () => {
    expect(lastDays(1, new Date(2026, 7, 17))).toEqual({ from: '2026-08-17', to: '2026-08-17' });
  });
});

describe('CTR', () => {
  it('sin aperturas no hay porcentaje', () => {
    expect(ctrLabel(0, 0)).toBe('—');
  });

  it('redondea a entero', () => {
    expect(ctrLabel(3, 1)).toBe('33%');
    expect(ctrLabel(8, 2)).toBe('25%');
  });

  it('todos los que abrieron clickearon', () => {
    expect(ctrLabel(10, 10)).toBe('100%');
  });
});
