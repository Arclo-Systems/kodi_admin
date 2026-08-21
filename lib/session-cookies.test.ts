import { describe, expect, it, vi } from 'vitest';
import { applyBackendSession, mergedCookieHeader } from './session-cookies';

const AT =
  'admin_at=at-nuevo; Max-Age=900; Path=/; HttpOnly; Secure; SameSite=Lax';
const RT =
  'admin_rt=rt-nuevo; Max-Age=2592000; Path=/v1/admin/auth; HttpOnly; Secure; SameSite=Lax';

function sink() {
  return { set: vi.fn() };
}

describe('applyBackendSession', () => {
  it('escribe cada cookie del backend con la API de cookies (no como header suelto)', () => {
    const cookies = sink();

    applyBackendSession(cookies, [AT, RT], 1_000);

    expect(cookies.set).toHaveBeenCalledWith(
      'admin_at',
      'at-nuevo',
      expect.objectContaining({ path: '/', httpOnly: true, maxAge: 900 }),
    );
    expect(cookies.set).toHaveBeenCalledWith(
      'admin_rt',
      'rt-nuevo',
      expect.objectContaining({ path: '/' }),
    );
  });

  it('publica admin_at_exp legible por JS con el vencimiento del access', () => {
    const cookies = sink();

    applyBackendSession(cookies, [AT, RT], 1_000);

    expect(cookies.set).toHaveBeenCalledWith(
      'admin_at_exp',
      String(1_000 + 900_000),
      expect.objectContaining({ httpOnly: false, path: '/', secure: true }),
    );
  });

  it('no publica admin_at_exp si el lote no renueva el access token', () => {
    const cookies = sink();

    applyBackendSession(cookies, [RT], 1_000);

    expect(cookies.set).toHaveBeenCalledTimes(1);
    expect(cookies.set).not.toHaveBeenCalledWith(
      'admin_at_exp',
      expect.anything(),
      expect.anything(),
    );
  });

  it('ignora headers Set-Cookie ilegibles', () => {
    const cookies = sink();

    applyBackendSession(cookies, ['   '], 1_000);

    expect(cookies.set).not.toHaveBeenCalled();
  });
});

describe('mergedCookieHeader', () => {
  it('pisa el valor viejo del access token con el recién emitido', () => {
    const merged = mergedCookieHeader('admin_at=viejo; admin_rt=rt-viejo', [AT]);

    expect(merged).toBe('admin_at=at-nuevo; admin_rt=rt-viejo');
  });

  it('agrega la cookie cuando la request no la traía', () => {
    expect(mergedCookieHeader(null, [AT])).toBe('admin_at=at-nuevo');
  });

  it('conserva cookies ajenas', () => {
    expect(mergedCookieHeader('theme=dark', [AT])).toBe(
      'theme=dark; admin_at=at-nuevo',
    );
  });
});
