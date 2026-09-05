import { throwApiError } from '@/lib/bff';

// Descarga un archivo del BFF y la entrega al browser como blob.
//
// No se usa `<a href download>`: ahí el browser guarda lo que venga, sea lo que
// sea. Un 413 REPORT_TOO_LARGE o un 401 de sesión caída terminaban en el disco
// del founder como un `.csv` que al abrirse dice `{"error":{...}}` — el reporte
// "se bajó" y el problema aparece recién en Excel. Pidiendo el archivo con fetch,
// el error se lee acá y se muestra con el `message` del backend.
export async function downloadReport(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) await throwApiError(res, 'No se pudo generar el archivo');

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  // El nombre lo pone el backend (lleva la cuenta, la moneda y el rango del
  // reporte); el de acá es solo el respaldo si el header no viaja.
  link.download = filenameFrom(res.headers.get('content-disposition')) ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Diferido un tick: Firefox y Safari leen el blob DESPUÉS del click, y
  // revocarlo en la misma vuelta del event loop aborta la descarga.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

// `attachment; filename="mayor_6900_2026-01-01_2026-09-30.csv"`
const FILENAME = /filename="?([^";]+)"?/i;

function filenameFrom(header: string | null): string | null {
  const match = header ? FILENAME.exec(header) : null;
  return match?.[1]?.trim() || null;
}
