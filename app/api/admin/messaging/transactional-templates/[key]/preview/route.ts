import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return forwardToBackend(
    req,
    'POST',
    `/v1/admin/messaging/transactional-templates/${key}/preview`,
  );
}
