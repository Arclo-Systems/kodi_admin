import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ ucId: string }> }) {
  const { ucId } = await params;
  return forwardToBackend(
    req,
    'POST',
    `/v1/admin/economy/coupons/user-coupons/${ucId}/refund-invalidate`,
  );
}
