import { fetchJson } from '@/lib/fetch-json';

/**
 * Pide un enlace firmado fresco al backend y lo abre. No se cachea (el enlace
 * expira ~5 min, AUD-PERF-1).
 *
 * La ventana se abre de forma SÍNCRONA con el gesto: pedir la URL primero y
 * abrir después de un `await` lo come el bloqueador de popups, y el archivo no
 * se abre nunca sin que aparezca ningún error.
 *
 * El enlace se pide con `fetchJson`, que traduce el envelope de error del
 * backend a un `ApiError` con SU `message`. Un `throw new Error('No se pudo
 * obtener el enlace')` genérico —lo que había acá— tapaba justo lo que el
 * usuario necesita leer: el 409 `PACKAGE_NOT_READY` dice en qué estado quedó el
 * paquete, y el 404 dice qué archivos sí existen.
 */
export async function openSignedAsset(apiPath: string): Promise<void> {
  const win = window.open('about:blank', '_blank');
  try {
    const url = (await fetchJson<{ url: string | null }>(apiPath))?.url ?? null;
    if (!url) throw new Error('El archivo no está disponible');
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch (err) {
    // Sin esto queda una pestaña en blanco abierta y el error solo en el toast.
    win?.close();
    throw err;
  }
}
