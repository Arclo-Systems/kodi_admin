import { NextRequest, NextResponse } from 'next/server';

// Server-only (NO importar desde Client Components). Reenvía una request del route
// handler BFF al backend Kodi, propagando cookies y status. Para login (Set-Cookie)
// usar el handler dedicado que reescribe cookies con adaptBackendCookie.
export async function forwardToBackend(
  req: NextRequest,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const hasBody = method === 'POST' || method === 'PATCH' || method === 'PUT';
  const body = hasBody ? await req.text() : undefined;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method,
    headers: hasBody ? { cookie, 'content-type': 'application/json' } : { cookie },
    body,
    cache: 'no-store',
  });

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}

// Descargas (CSV): el backend responde `text/csv` con su propio `content-disposition`
// (el nombre del archivo lleva el rango del reporte), así que NO se puede usar
// `forwardToBackend`, que parsea JSON. El error sí viaja como JSON: se reenvía tal
// cual para que el panel muestre el `message` del backend (413 REPORT_TOO_LARGE).
export async function forwardDownloadToBackend(
  req: NextRequest,
  path: string,
): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  }

  const headers = new Headers();
  for (const header of ['content-type', 'content-disposition']) {
    const value = res.headers.get(header);
    if (value) headers.set(header, value);
  }
  return new NextResponse(await res.arrayBuffer(), { status: 200, headers });
}
