import { describe, expect, it } from 'vitest';
import {
  civilDayEndIso,
  civilDayStartIso,
  civilDayToIso,
  formatCivilDay,
  isoToCivilDay,
} from './civil-date';

// Así formatea la tabla de movimientos (`finance-entries-table.tsx`): construye un Date con el
// ISO que devolvió el backend y lo pinta en la hora del navegador. El `timeZone` explícito acá
// simula desde qué zona lo está mirando el admin, para no depender del TZ de la máquina que
// corre los tests (el repo no fija TZ en vitest.config.ts).
const comoLoMuestraLaTabla = (iso: string, timeZone: string): string =>
  new Date(iso).toLocaleDateString('es-CR', { timeZone });

describe('civilDayToIso', () => {
  it('ancla el día civil a mediodía UTC', () => {
    expect(civilDayToIso('2026-03-07')).toBe('2026-03-07T12:00:00.000Z');
  });

  it('el día que carga el admin es el que ve en la tabla desde Costa Rica', () => {
    // El bug reproducido: se cargó el 7/3/2026 y la fila mostraba 6/3/2026, porque
    // `new Date('2026-03-07')` es medianoche UTC = 6/3 18:00 en CR (UTC−6).
    expect(comoLoMuestraLaTabla(civilDayToIso('2026-03-07'), 'America/Costa_Rica')).toBe(
      '7/3/2026',
    );
  });

  it('no corre el día en el último día del mes', () => {
    expect(comoLoMuestraLaTabla(civilDayToIso('2026-07-31'), 'America/Costa_Rica')).toBe(
      '31/7/2026',
    );
  });

  it('no corre el día ni el año en el 31 de diciembre', () => {
    expect(comoLoMuestraLaTabla(civilDayToIso('2026-12-31'), 'America/Costa_Rica')).toBe(
      '31/12/2026',
    );
  });

  it('no corre el día en el 1 de enero', () => {
    expect(comoLoMuestraLaTabla(civilDayToIso('2026-01-01'), 'America/Costa_Rica')).toBe(
      '1/1/2026',
    );
  });

  it('no corre el día en el 29 de febrero de un año bisiesto', () => {
    expect(comoLoMuestraLaTabla(civilDayToIso('2028-02-29'), 'America/Costa_Rica')).toBe(
      '29/2/2028',
    );
  });

  // El margen del ancla es de ±12 h, así que aguanta toda la banda en la que se opera el panel
  // (CR es UTC−6; la expansión mira CO/MX/CL/España) y bastante más.
  it.each([
    ['Pacific/Niue', 'UTC−11'],
    ['America/Costa_Rica', 'UTC−6'],
    ['UTC', 'UTC'],
    ['Europe/Madrid', 'UTC+2'],
    ['Asia/Tokyo', 'UTC+9'],
    ['Australia/Sydney', 'UTC+11'],
  ])('muestra el mismo día civil desde %s (%s)', (timeZone) => {
    expect(comoLoMuestraLaTabla(civilDayToIso('2026-12-31'), timeZone)).toBe('31/12/2026');
  });

  it('rechaza lo que no es un día civil', () => {
    expect(() => civilDayToIso('')).toThrow();
    expect(() => civilDayToIso('2026-3-7')).toThrow();
    expect(() => civilDayToIso('2026-12-31T00:00:00.000Z')).toThrow();
  });
});

describe('civilDayStartIso / civilDayEndIso', () => {
  it('el rango cubre los dos días civiles completos', () => {
    expect(civilDayStartIso('2026-01-01')).toBe('2026-01-01T00:00:00.000Z');
    expect(civilDayEndIso('2026-12-31')).toBe('2026-12-31T23:59:59.999Z');
  });

  it('un movimiento del último día del rango cae adentro del corte superior', () => {
    // El backend filtra con `lte`, así que el borde de arriba tiene que ser el final del día:
    // con el día pelado ('2026-12-31' → medianoche UTC) el gasto de ese día quedaba afuera.
    const gasto = new Date(civilDayToIso('2026-12-31')).getTime();
    expect(gasto).toBeLessThanOrEqual(new Date(civilDayEndIso('2026-12-31')).getTime());
    expect(gasto).toBeGreaterThan(new Date('2026-12-31').getTime());
  });

  it('rechaza lo que no es un día civil', () => {
    expect(() => civilDayStartIso('31/12/2026')).toThrow();
    expect(() => civilDayEndIso('')).toThrow();
  });
});

describe('formatCivilDay', () => {
  it('muestra el día civil de un campo guardado a medianoche UTC sin correrlo', () => {
    // Es el caso de cupones y facturas: el valor guardado ya es el día civil a 00:00Z, así que
    // leerlo en UTC es la inversa exacta. Con formato local en CR esto mostraba 30/12/2026.
    expect(formatCivilDay('2026-12-31T00:00:00.000Z')).toBe('31/12/2026');
  });

  it('no depende de la zona desde la que se mire', () => {
    expect(formatCivilDay('2026-07-31T00:00:00.000Z')).toBe('31/7/2026');
    expect(formatCivilDay('2026-01-01T00:00:00.000Z')).toBe('1/1/2026');
  });
});

describe('isoToCivilDay', () => {
  it('lee de vuelta el día que se guardó', () => {
    expect(isoToCivilDay(civilDayToIso('2026-12-31'))).toBe('2026-12-31');
  });

  it('lee el día de un movimiento viejo guardado a medianoche UTC sin correrlo', () => {
    // Los movimientos cargados antes del ancla quedaron en 00:00Z; el día civil que quiso el
    // admin es igual el del ISO, así que el formulario los sigue precargando bien.
    expect(isoToCivilDay('2026-07-31T00:00:00.000Z')).toBe('2026-07-31');
  });
});
