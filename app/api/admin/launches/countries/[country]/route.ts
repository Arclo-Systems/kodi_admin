import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  return forwardToBackend(req, 'PATCH', `/v1/admin/launches/countries/${country}`);
}
