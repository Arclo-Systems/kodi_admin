import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(req: NextRequest) {
  return forwardToBackend(req, 'POST', '/v1/admin/content/news/bulk-publish');
}
