import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Sin DSN (dev/test sin provisionar Sentry) el SDK queda inerte.
  enabled: Boolean(dsn) && process.env.NODE_ENV !== 'test',
  environment: process.env.NEXT_PUBLIC_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

// Instrumenta las transiciones de ruta del App Router (tracing de navegación).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
