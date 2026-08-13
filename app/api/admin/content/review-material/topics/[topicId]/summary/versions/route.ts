import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  return forwardToBackend(
    req,
    'GET',
    `/v1/admin/content/review-material/topics/${topicId}/summary/versions`,
  );
}
