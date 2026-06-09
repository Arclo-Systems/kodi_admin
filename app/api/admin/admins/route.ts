import { NextRequest, NextResponse } from 'next/server';

// BFF proxy: lista (GET) e invitación (POST) de admins.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const url = new URL('/v1/admin/admins', process.env.NEXT_PUBLIC_API_URL);
  for (const [k, v] of req.nextUrl.searchParams) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { cookie }, cache: 'no-store' });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/admin/admins`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body,
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
