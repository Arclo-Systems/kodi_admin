import { unwrapData } from '@/lib/bff';

// Pide un enlace firmado fresco al backend y lo abre. No se cachea (el enlace expira ~5 min, AUD-PERF-1).
// Abre la ventana de forma síncrona con el gesto para no gatillar el bloqueador de popups; luego le
// asigna la URL firmada cuando llega.
export async function openSignedAsset(apiPath: string): Promise<void> {
  const win = window.open('about:blank', '_blank');
  try {
    const res = await fetch(apiPath, { credentials: 'include' });
    if (!res.ok) throw new Error('No se pudo obtener el enlace');
    const url = unwrapData<{ url: string | null }>(await res.json())?.url ?? null;
    if (!url) throw new Error('El archivo no está disponible');
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch (err) {
    win?.close();
    throw err;
  }
}
