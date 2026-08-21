import { describe, expect, it } from 'vitest';
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  RENEW_BEFORE_EXPIRY_MS,
  readAccessExpiry,
  nextSessionStep,
} from './session-expiry';

const ACTIVE_AT = 1_000_000;

describe('readAccessExpiry', () => {
  it('lee el vencimiento publicado en admin_at_exp', () => {
    expect(readAccessExpiry('theme=dark; admin_at_exp=1755772800000')).toBe(
      1755772800000,
    );
  });

  it('devuelve null si la cookie no está', () => {
    expect(readAccessExpiry('theme=dark')).toBeNull();
  });

  it('devuelve null si el valor no es un número', () => {
    expect(readAccessExpiry('admin_at_exp=pronto')).toBeNull();
  });
});

describe('nextSessionStep', () => {
  const base = {
    lastActivityAt: ACTIVE_AT,
    accessExpiresAt: ACTIVE_AT + 15 * 60_000,
  };

  it('espera mientras la sesión está fresca', () => {
    expect(nextSessionStep({ ...base, now: ACTIVE_AT + 1_000 })).toBe('wait');
  });

  it('renueva en silencio cuando el access está por vencer', () => {
    const now = base.accessExpiresAt - RENEW_BEFORE_EXPIRY_MS + 1;
    expect(nextSessionStep({ ...base, now })).toBe('renew');
  });

  it('avisa al llegar al umbral de inactividad', () => {
    expect(
      nextSessionStep({ ...base, now: ACTIVE_AT + IDLE_WARNING_MS }),
    ).toBe('warn');
  });

  it('expira al agotarse la inactividad', () => {
    expect(
      nextSessionStep({ ...base, now: ACTIVE_AT + IDLE_TIMEOUT_MS }),
    ).toBe('expire');
  });

  it('el aviso de inactividad gana sobre la renovación silenciosa', () => {
    const now = ACTIVE_AT + IDLE_WARNING_MS;
    expect(nextSessionStep({ ...base, now, accessExpiresAt: now })).toBe('warn');
  });

  it('sin vencimiento conocido no renueva, solo vigila la inactividad', () => {
    expect(
      nextSessionStep({
        ...base,
        accessExpiresAt: null,
        now: ACTIVE_AT + 14 * 60_000,
      }),
    ).toBe('wait');
  });
});
