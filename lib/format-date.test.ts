import { afterEach, describe, expect, it } from 'vitest';
import { PANEL_TIME_ZONE, formatDate, formatDateTime } from './format-date';

// 01:00 UTC del 19/9 son las 19:00 del 18/9 en Costa Rica (UTC−6): el instante que cruza la
// medianoche UTC es el que delata si el formato está leyendo la zona equivocada.
const NOCHE_EN_CR = '2026-09-19T01:00:00.000Z';

const TZ_ORIGINAL = process.env.TZ;

/** Corre `fn` como si el proceso tuviera el reloj de `timeZone` (Vercel corre en UTC). */
function conRelojDelProceso<T>(timeZone: string, fn: () => T): T {
  process.env.TZ = timeZone;
  try {
    return fn();
  } finally {
    process.env.TZ = TZ_ORIGINAL;
  }
}

afterEach(() => {
  process.env.TZ = TZ_ORIGINAL;
});

describe('PANEL_TIME_ZONE', () => {
  it('es la zona desde la que se opera el panel', () => {
    expect(PANEL_TIME_ZONE).toBe('America/Costa_Rica');
  });
});

describe('formatDate', () => {
  it('muestra el día en hora de Costa Rica, no el día UTC', () => {
    expect(formatDate(NOCHE_EN_CR)).toBe('18/9/2026');
  });

  it('acepta epoch ms y Date además del ISO', () => {
    expect(formatDate(Date.parse(NOCHE_EN_CR))).toBe('18/9/2026');
    expect(formatDate(new Date(NOCHE_EN_CR))).toBe('18/9/2026');
  });

  it('devuelve un guion si no hay instante o no es parseable', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('no-es-una-fecha')).toBe('—');
  });

  it('admite variantes por opciones sin volver a `toLocaleDateString`', () => {
    expect(formatDate(NOCHE_EN_CR, { dateStyle: 'long' })).toBe('18 de septiembre de 2026');
    expect(formatDate(NOCHE_EN_CR, { month: 'long' })).toBe('septiembre');
  });
});

describe('formatDateTime', () => {
  it('muestra la hora de Costa Rica en reloj de 24 h', () => {
    expect(formatDateTime(NOCHE_EN_CR)).toBe('18/9/2026, 19:00');
  });

  it('no corre el día al siguiente como hacía el formato sin zona', () => {
    // El bug: en Vercel (reloj UTC) esto se pintaba "19/9/2026, 01:00".
    expect(formatDateTime(NOCHE_EN_CR)).not.toContain('19/9/2026');
  });

  it('admite pedir solo la hora por opciones', () => {
    expect(formatDateTime(NOCHE_EN_CR, { hour: '2-digit', minute: '2-digit' })).toBe('19:00');
  });

  it('devuelve un guion si no hay instante', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('independencia del reloj del proceso', () => {
  // Es exactamente el bug reportado: los Server Components corren en Vercel (UTC) y los Client
  // Components en el navegador del admin (CR), y la misma columna salía con seis horas de
  // diferencia según la pantalla.
  it.each(['UTC', 'America/Costa_Rica', 'Europe/Madrid', 'Asia/Tokyo'])(
    'formatea igual con el proceso en %s',
    (timeZone) => {
      expect(conRelojDelProceso(timeZone, () => formatDate(NOCHE_EN_CR))).toBe('18/9/2026');
      expect(conRelojDelProceso(timeZone, () => formatDateTime(NOCHE_EN_CR))).toBe(
        '18/9/2026, 19:00',
      );
    },
  );

  it('el render del servidor y el del navegador coinciden', () => {
    const enElServidor = conRelojDelProceso('UTC', () => formatDateTime(NOCHE_EN_CR));
    const enElNavegador = conRelojDelProceso('America/Costa_Rica', () =>
      formatDateTime(NOCHE_EN_CR),
    );
    expect(enElServidor).toBe(enElNavegador);
  });
});
