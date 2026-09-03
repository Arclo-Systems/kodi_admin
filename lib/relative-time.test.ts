import { describe, expect, it } from 'vitest';
import { timeAgo } from './relative-time';

const AHORA = new Date('2026-09-02T12:00:00.000Z');

describe('timeAgo', () => {
  it('describe la espera en español, con el sufijo "hace"', () => {
    expect(timeAgo('2026-08-30T12:00:00.000Z', AHORA)).toBe('hace 3 días');
    expect(timeAgo('2026-09-02T11:55:00.000Z', AHORA)).toBe('hace 5 minutos');
  });

  it('no cae a "0 días" cuando la espera es de segundos', () => {
    expect(timeAgo('2026-09-02T11:59:30.000Z', AHORA)).toBe('hace 30 segundos');
  });

  it('devuelve un guion si el instante no es parseable', () => {
    expect(timeAgo('no-es-una-fecha', AHORA)).toBe('—');
  });
});
