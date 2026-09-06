import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return forwardToBackend(
    req,
    'POST',
    `/v1/admin/finance/play-orders/${encodeURIComponent(orderId)}/retry`,
  );
}
