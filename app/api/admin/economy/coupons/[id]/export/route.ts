import { NextRequest, NextResponse } from 'next/server';

// Proxy dedicado para el CSV de canjes: el backend responde text/csv, así que NO se
// puede usar forwardToBackend (parsea JSON). Reenvía el cuerpo como texto + headers.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = req.headers.get('cookie') ?? '';
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/economy/coupons/${id}/export`,
    { headers: { cookie }, cache: 'no-store' },
  );

  if (!res.ok) {
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  }

  const csv = await res.text();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition':
        res.headers.get('content-disposition') ??
        `attachment; filename="coupon-${id}-redemptions.csv"`,
    },
  });
}
