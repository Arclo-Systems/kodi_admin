import { NextRequest, NextResponse } from 'next/server';

// BFF: proxy de /v1/admin/audit-log/by-resource (reenvía cookies + query params).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const url = new URL('/v1/admin/audit-log/by-resource', process.env.NEXT_PUBLIC_API_URL);
  for (const [k, v] of req.nextUrl.searchParams) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { cookie }, cache: 'no-store' });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
