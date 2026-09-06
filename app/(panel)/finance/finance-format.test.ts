import { describe, it, expect } from 'vitest';
import { formatAmount, formatMoney, subtractMoney } from './finance-format';

// La resta de importes existe por una sola razón: el "bruto sin impuesto" de una
// orden de Google (`total − impuesto`) no viaja en la respuesta y hay que
// derivarlo. Pasarlo por `Number` reintroduce el double justo en la capa que
// solo pinta, así que la cuenta se hace en céntimos enteros.
describe('subtractMoney — resta exacta sin punto flotante', () => {
  it('resta el impuesto del total conservando los dos decimales', () => {
    expect(subtractMoney('12.99', '1.69')).toBe('11.30');
  });

  it('no arrastra el error de 0.1 + 0.2 que tendría un double', () => {
    expect(subtractMoney('0.30', '0.10')).toBe('0.20');
    expect(subtractMoney('1000000000000.01', '0.02')).toBe('999999999999.99');
  });

  it('devuelve negativo cuando el sustraendo es mayor', () => {
    expect(subtractMoney('1.00', '2.50')).toBe('-1.50');
  });

  it('devuelve null ante un importe que no tiene la forma del backend', () => {
    expect(subtractMoney('12', '1.69')).toBeNull();
    expect(subtractMoney('12.9', '1.69')).toBeNull();
    expect(subtractMoney('', '1.69')).toBeNull();
  });
});

describe('formatMoney / formatAmount — el string del backend se pinta tal cual', () => {
  it('agrupa los miles con espacio duro y deja la coma decimal', () => {
    expect(formatMoney('1234.56')).toBe('1 234,56');
  });

  it('pega la moneda cruda que mandó Google, sin traducirla a la del panel', () => {
    expect(formatAmount('9.61', 'BRL')).toBe('9,61 BRL');
  });
});
