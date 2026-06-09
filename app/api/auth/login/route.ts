import { NextRequest, NextResponse } from 'next/server';
import { adaptBackendCookie } from '@/lib/bff';

// BFF: proxyea el login al backend y reenvía las cookies HTTP-only (admin_at/admin_rt)
// al browser. El browser nunca habla cross-origin con el backend.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

  const data = await backendRes.json().catch(() => ({}));
  const res = NextResponse.json(data, { status: backendRes.status });

  // getSetCookie() devuelve admin_at y admin_rt por separado; get('set-cookie') las colapsa.
  for (const cookie of backendRes.headers.getSetCookie?.() ?? []) {
    res.headers.append('set-cookie', adaptBackendCookie(cookie));
  }

  return res;
}
