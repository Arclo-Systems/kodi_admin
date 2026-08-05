import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return forwardToBackend(req, 'GET', `/v1/admin/legal/${doc}`);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return forwardToBackend(req, 'PUT', `/v1/admin/legal/${doc}`);
}
