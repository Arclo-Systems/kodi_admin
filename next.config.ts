import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Fija el root del proyecto: hay un package-lock.json suelto en el home del
// usuario que hace que Next infiera mal el workspace root (warning en dev/build).
const projectRoot = dirname(fileURLToPath(import.meta.url));

// Cabeceras de seguridad de línea base. Anti-clickjacking (el panel nunca se embebe),
// anti-MIME-sniffing, HSTS y referrer/permissions mínimos. NO incluye CSP a propósito:
// una CSP correcta exige inventariar los orígenes externos (API backend, CDN de assets,
// Sentry, tiles de mapa) y aplicarla mal rompe cargas en producción → se implementa
// aparte con ese inventario (ver auditoría F3.1).
const securityHeaders = [
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
