import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(
    req,
    'POST',
    `/v1/admin/finance/budgets/${id}/copy-from${qs ? `?${qs}` : ''}`,
  );
}
