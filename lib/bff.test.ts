import { describe, expect, it } from 'vitest';
import { parseBackendCookie, accessTokenExpiryFrom } from './bff';

const BACKEND_AT =
  'admin_at=abc.def; Max-Age=900; Path=/; Expires=Fri, 21 Aug 2026 10:00:00 GMT; HttpOnly; Secure; SameSite=Lax';
const BACKEND_RT =
  'admin_rt=deadbeef; Max-Age=2592000; Domain=holakodi.com; Path=/v1/admin/auth; HttpOnly; Secure; SameSite=Lax';

describe('parseBackendCookie', () => {
  it('extrae nombre, valor y atributos del access token', () => {
    expect(parseBackendCookie(BACKEND_AT)).toEqual({
      name: 'admin_at',
      value: 'abc.def',
      attributes: {
        maxAge: 900,
        path: '/',
        expires: new Date('Fri, 21 Aug 2026 10:00:00 GMT'),
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      },
    });
  });

  it('reescribe a / el Path scopeado del refresh token', () => {
    expect(parseBackendCookie(BACKEND_RT)?.attributes.path).toBe('/');
  });

  it('conserva el Domain cuando el backend lo declara', () => {
    expect(parseBackendCookie(BACKEND_RT)?.attributes.domain).toBe(
      'holakodi.com',
    );
  });

  it('devuelve null si el header no trae un par nombre=valor', () => {
    expect(parseBackendCookie('   ')).toBeNull();
  });

  it('acepta valores con signo igual adentro', () => {
    expect(parseBackendCookie('t=a=b=c; Path=/')?.value).toBe('a=b=c');
  });
});

describe('accessTokenExpiryFrom', () => {
  it('calcula el vencimiento del access token desde su Max-Age', () => {
    const now = 1_700_000_000_000;
    expect(accessTokenExpiryFrom([BACKEND_RT, BACKEND_AT], now)).toBe(
      now + 900_000,
    );
  });

  it('devuelve null si ninguna cookie es admin_at', () => {
    expect(accessTokenExpiryFrom([BACKEND_RT], 0)).toBeNull();
  });

  it('devuelve null si admin_at viene sin Max-Age', () => {
    expect(accessTokenExpiryFrom(['admin_at=x; Path=/'], 0)).toBeNull();
  });
});
