import { NextRequest, NextResponse } from 'next/server';

// BFF: emite el código 2FA. `?forward=` es la ruta BACKEND que dispara el envío
// del código por email (ej /v1/admin/admins/:id/request-2fa). Solo se permiten
// rutas /v1/admin/* para no convertir esto en un open proxy.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const forward = req.nextUrl.searchParams.get('forward');
  if (!forward || !forward.startsWith('/v1/admin/')) {
    return NextResponse.json({ error: 'forward inválido' }, { status: 400 });
  }

  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${forward}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });

  if (res.status === 204) return NextResponse.json({ ok: true });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
