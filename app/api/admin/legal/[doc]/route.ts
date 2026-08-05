import { NextRequest, NextResponse } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// `doc` sale del path y se concatena a la URL del backend. Whitelist anti
// open-proxy: son los únicos documentos que existen (enum `LegalDocType`).
const ALLOWED = new Set(['terms', 'privacy', 'raffle_rules']);

export async function GET(req: NextRequest, { params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!ALLOWED.has(doc)) {
    return NextResponse.json({ message: 'Documento no encontrado' }, { status: 404 });
  }
  return forwardToBackend(req, 'GET', `/v1/admin/legal/${doc}`);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!ALLOWED.has(doc)) {
    return NextResponse.json({ message: 'Documento no encontrado' }, { status: 404 });
  }
  return forwardToBackend(req, 'PUT', `/v1/admin/legal/${doc}`);
}
