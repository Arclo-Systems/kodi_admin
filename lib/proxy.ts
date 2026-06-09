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
