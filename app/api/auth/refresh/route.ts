import { NextRequest, NextResponse } from 'next/server';
import { applyBackendSession } from '@/lib/session-cookies';

// BFF: extiende la sesión a demanda (lo llama el aviso de expiración del panel).
//
// Contrato: POST sin body — la credencial es la cookie HTTP-only `admin_rt`. La respuesta
// espeja status y body del backend; el vencimiento nuevo NO viaja en el body, se lee de la
// cookie `admin_at_exp` (única fuente de verdad, la publica applyBackendSession).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const backendRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/auth/refresh`,
    { method: 'POST', headers: { cookie: req.headers.get('cookie') ?? '' } },
  );

  const data: unknown = await backendRes.json().catch(() => ({}));
  const res = NextResponse.json(data, { status: backendRes.status });

  applyBackendSession(res.cookies, backendRes.headers.getSetCookie?.() ?? []);

  return res;
}
