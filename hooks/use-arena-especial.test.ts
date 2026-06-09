import { describe, it, expect } from 'vitest';
import { hasOverlap } from './use-arena-especial';

// hasOverlap es el espejo cliente de la validación del backend (AUD-API2): los tramos de
// premio (rangos de ranking) no pueden solaparse. Rangos inclusivos en ambos extremos.
describe('hasOverlap', () => {
  it('lista vacía o un solo tramo nunca solapa', () => {
    expect(hasOverlap([])).toBe(false);
    expect(hasOverlap([{ min_rank: 1, max_rank: 10 }])).toBe(false);
  });

  it('tramos adyacentes sin tocarse no solapan', () => {
    expect(
      hasOverlap([
        { min_rank: 1, max_rank: 10 },
        { min_rank: 11, max_rank: 20 },
      ]),
    ).toBe(false);
  });

  it('tramos que se solapan detectan colisión', () => {
    expect(
      hasOverlap([
        { min_rank: 1, max_rank: 10 },
        { min_rank: 5, max_rank: 15 },
      ]),
    ).toBe(true);
  });

  it('tocar el límite exacto cuenta como solape (rangos inclusivos)', () => {
    expect(
      hasOverlap([
        { min_rank: 1, max_rank: 10 },
        { min_rank: 10, max_rank: 20 },
      ]),
    ).toBe(true);
  });

  it('no depende del orden de entrada (ordena antes de comparar)', () => {
    expect(
      hasOverlap([
        { min_rank: 11, max_rank: 20 },
        { min_rank: 1, max_rank: 10 },
      ]),
    ).toBe(false);
    expect(
      hasOverlap([
        { min_rank: 5, max_rank: 15 },
        { min_rank: 1, max_rank: 10 },
      ]),
    ).toBe(true);
  });
});
