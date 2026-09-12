import { describe, expect, it } from 'vitest';
import { isReversedRate, readRateDirection } from './exchange-rate-direction';

describe('isReversedRate', () => {
  it('458 en CRC→USD son colones por dólar: el par al revés', () => {
    expect(isReversedRate({ fromCurrency: 'CRC', toCurrency: 'USD', rate: 458 })).toBe(true);
  });

  it('0.002 en USD→CRC también está invertida', () => {
    expect(isReversedRate({ fromCurrency: 'USD', toCurrency: 'CRC', rate: 0.002 })).toBe(true);
  });

  it('las dos direcciones plausibles pasan', () => {
    expect(isReversedRate({ fromCurrency: 'CRC', toCurrency: 'USD', rate: 0.00218341 })).toBe(
      false,
    );
    expect(isReversedRate({ fromCurrency: 'USD', toCurrency: 'CRC', rate: 458 })).toBe(false);
  });

  it('un par sin dólar no se juzga por dirección: no hay banda que aplicar', () => {
    expect(isReversedRate({ fromCurrency: 'CRC', toCurrency: 'GTQ', rate: 5000 })).toBe(false);
  });
});

describe('readRateDirection', () => {
  it('da las dos lecturas de una tasa plausible, sin aviso', () => {
    expect(
      readRateDirection({ fromCurrency: 'CRC', toCurrency: 'USD', rate: '0.00218' }),
    ).toEqual({
      forward: '1 CRC = 0.00218 USD',
      inverse: '1 USD = 458.72 CRC',
      warning: null,
    });
  });

  it('avisa con el inverso cuando la tasa está al revés', () => {
    const leida = readRateDirection({ fromCurrency: 'CRC', toCurrency: 'USD', rate: '458' });
    expect(leida?.forward).toBe('1 CRC = 458 USD');
    expect(leida?.warning).toBe(
      '458 parece la tasa del par al revés (1 USD = 458 CRC). Para CRC→USD cargá 0.00218341 (1/458), o registrá el par USD→CRC con 458.',
    );
  });

  it('sugiere 500 para 0.002 en USD→CRC', () => {
    expect(
      readRateDirection({ fromCurrency: 'USD', toCurrency: 'CRC', rate: '0.002' })?.warning,
    ).toContain('cargá 500 (1/0.002)');
  });

  it('sin número usable no hay vista previa que mostrar', () => {
    for (const rate of ['', '  ', '0', 'abc', '-1']) {
      expect(readRateDirection({ fromCurrency: 'CRC', toCurrency: 'USD', rate })).toBeNull();
    }
    expect(readRateDirection({ fromCurrency: 'CRC', toCurrency: 'CRC', rate: '1' })).toBeNull();
  });
});
