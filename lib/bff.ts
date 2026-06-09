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
