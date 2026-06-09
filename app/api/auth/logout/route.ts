import { NextRequest, NextResponse } from 'next/server';

// BFF: cierra sesión en el backend (revoca el refresh token) y limpia las cookies del browser.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/admin/auth/logout`, {
    method: 'POST',
    headers: { cookie },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_at');
  res.cookies.delete('admin_rt');
  return res;
}
