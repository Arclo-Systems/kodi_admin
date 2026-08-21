const BACKEND_REFRESH_PATH = '/v1/admin/auth';

export const ACCESS_TOKEN_COOKIE = 'admin_at';
export const ACCESS_EXPIRY_COOKIE = 'admin_at_exp';

export type BackendCookieAttributes = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
};

export type ParsedBackendCookie = {
  name: string;
  value: string;
  attributes: BackendCookieAttributes;
};

// El backend scopea la cookie admin_rt a Path=/v1/admin/auth (defensa en profundidad
// para clientes que pegan directo a la API). En el modelo BFF la cookie vive en el
// origen del frontend y el `proxy` la necesita en TODAS las navegaciones para refrescar
// → reescribimos su Path a / al reenviarla al browser. admin_at ya viene con Path=/.
//
// Se devuelve estructurado (y no el string tal cual) porque el browser NO es el único
// consumidor: Next solo propaga al render de la misma request las cookies escritas con
// la API `ResponseCookies` (`res.cookies.set`). Appendear el header a mano deja al
// Server Component leyendo la cookie vieja — que es como el panel echaba al admin
// justo después de refrescar.
export function parseBackendCookie(
  setCookie: string,
): ParsedBackendCookie | null {
  const [pair, ...rest] = setCookie.split(';');
  const eq = pair?.indexOf('=') ?? -1;
  if (!pair || eq <= 0) return null;

  const attributes: BackendCookieAttributes = {};
  for (const part of rest) {
    const [rawKey, ...rawValue] = part.split('=');
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue.join('=').trim();
    if (key === 'path') attributes.path = value;
    else if (key === 'domain') attributes.domain = value;
    else if (key === 'max-age') attributes.maxAge = Number(value);
    else if (key === 'expires') attributes.expires = new Date(value);
    else if (key === 'httponly') attributes.httpOnly = true;
    else if (key === 'secure') attributes.secure = true;
    else if (key === 'samesite')
      attributes.sameSite = value.toLowerCase() as 'lax' | 'strict' | 'none';
  }
  if (attributes.path === BACKEND_REFRESH_PATH) attributes.path = '/';

  return {
    name: pair.slice(0, eq).trim(),
    value: pair.slice(eq + 1).trim(),
    attributes,
  };
}

/** Instante (epoch ms) en que vence el access token del lote de cookies del backend. */
export function accessTokenExpiryFrom(
  setCookies: readonly string[],
  now: number,
): number | null {
  for (const raw of setCookies) {
    const cookie = parseBackendCookie(raw);
    if (cookie?.name !== ACCESS_TOKEN_COOKIE) continue;
    const maxAge = cookie.attributes.maxAge;
    if (maxAge === undefined || Number.isNaN(maxAge)) return null;
    return now + maxAge * 1000;
  }
  return null;
}

// El backend envuelve TODAS las respuestas en { data: T } (TransformInterceptor global).
// El spec OpenAPI no declara el envelope (es un interceptor), así que el codegen no lo
// refleja → desenvolver explícitamente en cada consumo de datos del panel.
export function unwrapData<T>(body: unknown): T | undefined {
  return (body as { data?: T } | null | undefined)?.data;
}

type ApiErrorBody = { code: string; message: string; details?: Record<string, unknown> };

// Los errores del backend viajan como { error: { code, message, details } } (GlobalExceptionFilter),
// NO como { message } — leerlos mal es lo que deja los toasts en un "Error" genérico.
function unwrapError(body: unknown): ApiErrorBody | undefined {
  const err = (body as { error?: unknown } | null | undefined)?.error;
  if (typeof err !== 'object' || err === null) return undefined;
  const { code, message, details } = err as Partial<ApiErrorBody>;
  if (typeof code !== 'string' || typeof message !== 'string') return undefined;
  return { code, message, details };
}

/** Error de negocio con el `code` del backend, para que la UI pueda reaccionar a uno puntual. */
class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body: unknown = await res.json().catch(() => null);
  const parsed = unwrapError(body);
  if (parsed) throw new ApiError(parsed.code, parsed.message, parsed.details);
  const legacy = (body as { message?: string } | null)?.message;
  throw new ApiError('UNKNOWN', legacy ?? fallback);
}
