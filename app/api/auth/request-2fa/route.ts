import { NextRequest, NextResponse } from 'next/server';

// `forward` llega del cliente: se resuelve contra la base del backend ANTES de
// mirar el prefijo, porque un startsWith sobre el string crudo deja pasar
// `/v1/admin/../auth/...` (el `..` recién se normaliza al construir la URL).
function resolveAdminUrl(forward: string): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const target = new URL(forward, base);
    if (target.origin !== new URL(base).origin) return null;
    if (!target.pathname.startsWith('/v1/admin/')) return null;
    return target.toString();
  } catch {
    return null;
  }
}

// BFF: emite el código 2FA. `?forward=` es la ruta BACKEND que dispara el envío
// del código por email (ej /v1/admin/admins/:id/request-2fa). Solo se permiten
// rutas /v1/admin/* para no convertir esto en un open proxy.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const forward = req.nextUrl.searchParams.get('forward');
  const target = forward ? resolveAdminUrl(forward) : null;
  if (!target) {
    return NextResponse.json({ error: 'forward inválido' }, { status: 400 });
  }

  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const res = await fetch(target, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });

  if (res.status === 204) return NextResponse.json({ ok: true });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
