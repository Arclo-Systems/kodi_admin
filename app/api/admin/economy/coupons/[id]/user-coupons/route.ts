import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(
    req,
    'GET',
    `/v1/admin/economy/coupons/${id}/user-coupons${qs ? `?${qs}` : ''}`,
  );
}
