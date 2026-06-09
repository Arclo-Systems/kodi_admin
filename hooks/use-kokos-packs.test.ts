import { describe, it, expect } from 'vitest';
import { offerStatus } from './use-kokos-packs';

const DAY = 86_400_000;
const future = (ms = DAY) => new Date(Date.now() + ms).toISOString();
const past = (ms = DAY) => new Date(Date.now() - ms).toISOString();

// offerStatus decide qué precio/badge ve el usuario (vigente/programada/expirada). Solo se
// considera oferta si hay precio; la ventana [start, end] es opcional en ambos extremos.
describe('offerStatus', () => {
  it("sin precio de oferta => 'none' (aunque haya fechas)", () => {
    expect(
      offerStatus({ offerPriceUsdCents: null, offerStartsAt: past(), offerEndsAt: future() }),
    ).toBe('none');
  });

  it("precio sin ventana => 'active' (oferta abierta)", () => {
    expect(
      offerStatus({ offerPriceUsdCents: 99, offerStartsAt: null, offerEndsAt: null }),
    ).toBe('active');
  });

  it("inicio en el futuro => 'scheduled'", () => {
    expect(
      offerStatus({ offerPriceUsdCents: 99, offerStartsAt: future(), offerEndsAt: future(2 * DAY) }),
    ).toBe('scheduled');
  });

  it("fin en el pasado => 'expired'", () => {
    expect(
      offerStatus({ offerPriceUsdCents: 99, offerStartsAt: past(2 * DAY), offerEndsAt: past() }),
    ).toBe('expired');
  });

  it("dentro de la ventana => 'active'", () => {
    expect(
      offerStatus({ offerPriceUsdCents: 99, offerStartsAt: past(), offerEndsAt: future() }),
    ).toBe('active');
  });

  it("ya iniciada y sin fin => 'active'", () => {
    expect(
      offerStatus({ offerPriceUsdCents: 99, offerStartsAt: past(), offerEndsAt: null }),
    ).toBe('active');
  });
});
