import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

type Params = { params: Promise<{ id: string; offerId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, offerId } = await params;
  return forwardToBackend(req, 'PATCH', `/v1/admin/content/careers/${id}/offers/${offerId}`);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, offerId } = await params;
  return forwardToBackend(req, 'DELETE', `/v1/admin/content/careers/${id}/offers/${offerId}`);
}
