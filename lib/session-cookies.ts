import {
  ACCESS_EXPIRY_COOKIE,
  ACCESS_TOKEN_COOKIE,
  accessTokenExpiryFrom,
  parseBackendCookie,
  type BackendCookieAttributes,
} from './bff';

// Estructural a propósito: recibe `res.cookies` (ResponseCookies de Next) sin importar
// `next/server`, así el módulo se testea sin levantar el runtime del framework.
type CookieSink = {
  set(
    name: string,
    value: string,
    options: BackendCookieAttributes,
  ): unknown;
};

/**
 * Vuelca en la respuesta el lote de Set-Cookie que emitió el backend y publica
 * `admin_at_exp`.
 *
 * Las cookies se escriben con `cookies.set` y NO appendeando el header: solo por esa vía
 * Next las propaga al render de la misma request (probado en Next 16.3), que es lo que
 * evitaba que el panel echara al admin justo después de refrescar.
 *
 * `admin_at_exp` es la ÚNICA cookie legible por JS y contiene solo un timestamp (epoch ms):
 * el cliente necesita saber cuándo vence la sesión para avisar antes, y no puede leer
 * `admin_at` (HTTP-only, y debe seguir siéndolo). Un XSS que la lea no obtiene nada
 * aprovechable — nunca meter acá token, rol ni identificadores.
 */
export function applyBackendSession(
  cookies: CookieSink,
  setCookies: readonly string[],
  now: number = Date.now(),
): void {
  let accessCookie: BackendCookieAttributes | undefined;

  for (const raw of setCookies) {
    const cookie = parseBackendCookie(raw);
    if (!cookie) continue;
    cookies.set(cookie.name, cookie.value, cookie.attributes);
    if (cookie.name === ACCESS_TOKEN_COOKIE) accessCookie = cookie.attributes;
  }

  const expiresAt = accessTokenExpiryFrom(setCookies, now);
  if (expiresAt === null) return;

  cookies.set(ACCESS_EXPIRY_COOKIE, String(expiresAt), {
    httpOnly: false,
    secure: accessCookie?.secure ?? false,
    sameSite: 'lax',
    path: '/',
    maxAge: accessCookie?.maxAge,
  });
}

/**
 * Header `cookie` de la request con los valores recién emitidos pisados.
 *
 * El refresh del middleware ocurre en la misma request que después atiende el route
 * handler; sin este merge el handler reenvía al backend el access token viejo.
 */
export function mergedCookieHeader(
  existing: string | null,
  setCookies: readonly string[],
): string {
  const jar = new Map<string, string>();

  for (const part of existing?.split(';') ?? []) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }

  for (const raw of setCookies) {
    const cookie = parseBackendCookie(raw);
    if (cookie) jar.set(cookie.name, cookie.value);
  }

  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}
