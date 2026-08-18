// El backend scopea la cookie admin_rt a Path=/v1/admin/auth (defensa en profundidad
// para clientes que pegan directo a la API). En el modelo BFF la cookie vive en el
// origen del frontend y el `proxy` la necesita en TODAS las navegaciones para refrescar
// → reescribimos su Path a / al reenviarla al browser. admin_at ya viene con Path=/.
export function adaptBackendCookie(setCookie: string): string {
  return setCookie.replace('Path=/v1/admin/auth', 'Path=/');
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
