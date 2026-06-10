import { type NextRequest, type NextResponse } from 'next/server';
import { resolveSiteDir, serveStaticSite } from '@/lib/static-site';

// La documentación técnica (kodi-docs-tecnica, build de Astro con `base: '/tecnica'`),
// servida detrás de la sesión del panel. Ver lib/static-site.ts.
const SITE_DIR = resolveSiteDir({
  envVar: process.env.TECH_DOCS_SITE_DIR,
  bundledDirName: 'tecnica-dist',
  siblingRepo: 'kodi-docs-tecnica',
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  return serveStaticSite(req, ctx, SITE_DIR);
}
