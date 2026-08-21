import { throwApiError, unwrapData } from './bff';

/**
 * GET tipado contra el BFF: desenvuelve el envelope `{ data }` y, ante un error, tira
 * `ApiError` con el `status`.
 *
 * Ese status es lo que permite distinguir "se cayó la sesión" (401) de cualquier otro
 * fallo; los hooks que hacen `throw new Error('fetch … failed')` pierden ese dato y por
 * eso un 401 quedaba en un estado de error mudo, sin explicación ni salida.
 */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T | undefined> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  if (!res.ok) await throwApiError(res, 'No pudimos cargar los datos');
  return unwrapData<T>(await res.json());
}
