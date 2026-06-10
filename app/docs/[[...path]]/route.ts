import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';

// El manual (kodi-docs) es un build estático de Astro con `base: '/docs'`. Se sirve desde
// acá —y no desde public/— para exigir sesión del panel en cada request.
const DOCS_DIR = path.resolve(
  process.env.DOCS_SITE_DIR ?? path.join(process.cwd(), '..', 'kodi-docs', 'dist'),
);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
};

async function readDocsFile(rel: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const abs = path.resolve(DOCS_DIR, rel);
  if (abs !== DOCS_DIR && !abs.startsWith(DOCS_DIR + path.sep)) return null;
  try {
    const buf = await fs.readFile(abs);
    const bytes = new Uint8Array(new ArrayBuffer(buf.byteLength));
    bytes.set(buf);
    return bytes;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  if (!(await getCurrentAdmin())) return NextResponse.redirect(new URL('/login', req.url));

  const segments = (await ctx.params).path ?? [];
  if (segments.some((s) => s.includes('..'))) return new NextResponse(null, { status: 404 });

  const raw = segments.join('/');
  const ext = path.posix.extname(raw);
  // Astro construye en formato directorio: /panel/dashboard/ → panel/dashboard/index.html.
  const rel = ext ? raw : path.posix.join(raw, 'index.html');

  let body = await readDocsFile(rel);
  let status = 200;
  let type = MIME[ext || '.html'] ?? 'application/octet-stream';
  if (!body) {
    body = await readDocsFile('404.html');
    if (!body) return new NextResponse(null, { status: 404 });
    status = 404;
    type = MIME['.html'] as string;
  }

  // Los assets de _astro llevan hash en el nombre: cachear fuerte. El HTML, nunca.
  const cache =
    segments[0] === '_astro' ? 'private, max-age=31536000, immutable' : 'private, no-cache';

  return new NextResponse(body, {
    status,
    headers: { 'content-type': type, 'cache-control': cache },
  });
}
