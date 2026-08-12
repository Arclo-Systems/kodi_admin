import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  return forwardToBackend(
    req,
    'POST',
    `/v1/admin/content/review-material/topics/${topicId}/podcast/audio/confirm`,
  );
}
