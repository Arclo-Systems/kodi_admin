import { NextRequest, NextResponse } from 'next/server';

// BFF: proxyea el cambio de contraseña al backend reenviando las cookies.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const cookie = req.headers.get('cookie') ?? '';

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/admin/auth/change-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });

  if (res.status === 204) return NextResponse.json({ ok: true });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
