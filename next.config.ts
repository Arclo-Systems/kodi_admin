import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Fija el root del proyecto: hay un package-lock.json suelto en el home del
// usuario que hace que Next infiera mal el workspace root (warning en dev/build).
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    // El default de Next es [75]; habilitamos 90 para la imagen hero del login
    // (con `sizes` ya no se sobre-descarga, así que subir la calidad casi no pesa).
    qualities: [75, 90],
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
