import { describe, expect, it } from 'vitest';
import { currencyDecimals, currencySymbol, formatMoney } from './money';

describe('formatMoney', () => {
  it('pinta el grid CR en colones, sin céntimos y con separador de miles', () => {
    expect(formatMoney(250000, 'CRC')).toBe('₡2.500');
    expect(formatMoney(450000, 'CRC')).toBe('₡4.500');
    expect(formatMoney(1120000, 'CRC')).toBe('₡11.200');
  });

  it('pinta los precios fundador en colones', () => {
    expect(formatMoney(199000, 'CRC')).toBe('₡1.990');
    expect(formatMoney(349000, 'CRC')).toBe('₡3.490');
  });

  it('pinta el dólar con dos decimales y agrupación en inglés', () => {
    expect(formatMoney(499, 'USD')).toBe('$4.99');
    expect(formatMoney(22099, 'USD')).toBe('$220.99');
    expect(formatMoney(500000, 'USD')).toBe('$5,000.00');
  });

  it('no redondea los céntimos del dólar a entero', () => {
    expect(formatMoney(499, 'USD')).not.toBe('$5');
  });

  it('cae al código ISO cuando la moneda no tiene símbolo conocido', () => {
    expect(formatMoney(1234, 'XYZ')).toBe('XYZ 12,34');
  });
});

describe('currencySymbol / currencyDecimals', () => {
  it('mapea las monedas de los mercados de Kodi', () => {
    expect(currencySymbol('CRC')).toBe('₡');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('GTQ')).toBe('Q');
    expect(currencySymbol('HNL')).toBe('L');
    expect(currencySymbol('PAB')).toBe('B/.');
  });

  it('solo el colón se muestra sin decimales', () => {
    expect(currencyDecimals('CRC')).toBe(0);
    expect(currencyDecimals('USD')).toBe(2);
    expect(currencyDecimals('PAB')).toBe(2);
    expect(currencyDecimals('XYZ')).toBe(2);
  });
});
