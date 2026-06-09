import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(req, 'PUT', `/v1/admin/monetization/promo-offers/${id}/prices`);
}
