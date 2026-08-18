import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// Segmento estático: Next lo resuelve antes que `careers/[id]`, así que "offers"
// nunca se toma por un id de carrera.
export async function POST(req: NextRequest) {
  return forwardToBackend(req, 'POST', '/v1/admin/content/careers/offers/upload-csv');
}
