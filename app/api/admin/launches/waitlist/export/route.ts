import { NextRequest, NextResponse } from 'next/server';

// Proxy dedicado del CSV: el backend responde text/csv y `forwardToBackend` parsea JSON.
// Mismo patrón que el export de canjes de cupones.
export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  const qs = req.nextUrl.searchParams.toString();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/launches/waitlist/export${qs ? `?${qs}` : ''}`,
    { headers: { cookie }, cache: 'no-store' },
  );

  if (!res.ok) {
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  }

  return new NextResponse(await res.text(), {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition':
        res.headers.get('content-disposition') ?? 'attachment; filename="lista-espera.csv"',
    },
  });
}
