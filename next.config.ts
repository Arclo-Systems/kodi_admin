import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Fija el root del proyecto: hay un package-lock.json suelto en el home del
// usuario que hace que Next infiera mal el workspace root (warning en dev/build).
const projectRoot = dirname(fileURLToPath(import.meta.url));

// Origen (esquema+host) de una URL; null si no es parseable. Para derivar hosts de
// CSP desde las env sin romper el build cuando faltan.
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// CSP en modo REPORT-ONLY (F3.2): el browser reporta violaciones pero NO bloquea, así
// observamos en staging qué orígenes legítimos faltan antes de hacerla enforcing. Orígenes
// inventariados: API backend (NEXT_PUBLIC_API_URL, también sirve assets firmados), ingest de
// Sentry (DSN), y geocoding de Leaflet (nominatim). `img-src https:` cubre tiles OSM, markers
// de unpkg y los previews de URL arbitraria que escribe el admin. Inline de script/style se
// permite por ahora (Next + el <style> de chart.tsx); el endurecimiento a nonce es el paso
// siguiente, una vez report-only confirme que no rompe nada.
function buildContentSecurityPolicy(): string {
  const api = originOf(process.env.NEXT_PUBLIC_API_URL);
  const sentry = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const connect = [
    "'self'",
    api,
    sentry,
    'https://nominatim.openstreetmap.org',
  ].filter(Boolean);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; ');
}

// Cabeceras de seguridad de línea base. Anti-clickjacking (el panel nunca se embebe),
// anti-MIME-sniffing, HSTS y referrer/permissions mínimos. + CSP report-only (F3.2).
const securityHeaders = [
  {
    key: 'Content-Security-Policy-Report-Only',
    value: buildContentSecurityPolicy(),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Panel interno: nunca debe indexarse en buscadores, sin importar el dominio. Vercel solo
  // agrega noindex en *.vercel.app; con dominio propio hay que declararlo nosotros (F-SEO).
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // El manual (docs-dist/, generado por scripts/bundle-docs.mjs) no se importa desde código:
  // hay que incluirlo explícito en el bundle serverless del handler que lo sirve. La clave es
  // un GLOB contra el nombre de ruta — `[[...path]]` literal sería una clase de caracteres,
  // por eso se matchea con `*` (cubre /docs/[[...path]] sin pelear con el escaping).
  outputFileTracingIncludes: {
    '/docs/*': ['./docs-dist/**/*'],
    '/tecnica/*': ['./tecnica-dist/**/*'],
  },
  images: {
    // El default de Next es [75]; habilitamos 90 para la imagen hero del login
    // (con `sizes` ya no se sobre-descarga, así que subir la calidad casi no pesa).
    qualities: [75, 90],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

// withSentryConfig solo sube source maps si hay SENTRY_AUTH_TOKEN (CI/deploy);
// sin token el build es limpio y el SDK queda inerte sin NEXT_PUBLIC_SENTRY_DSN.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
