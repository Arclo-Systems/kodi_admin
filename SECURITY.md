# Política de seguridad

## Reportar una vulnerabilidad

Si encontrás una vulnerabilidad, **no abras un issue público**. Escribí a
**emiliorb26@gmail.com** con:

- Descripción y pasos de reproducción.
- Impacto potencial y alcance.
- Si aplica, una prueba de concepto.

Confirmamos la recepción dentro de las 48 h y coordinamos la divulgación
responsable una vez disponible el fix.

## Postura de seguridad

`kodi-admin` es un panel interno; su modelo de seguridad:

- **BFF same-origin.** El browser pega solo a `/api/admin/*` (proxies finos); nunca habla
  cross-origin con el backend. Las cookies de sesión son **HTTP-only** y no salen al cliente.
- **Autorización en el backend.** Los guards del backend (`@RequireRole`/`@RequireGlobalScope`)
  son la autoridad. `lib/permissions.ts` es **solo gating de UX** (defensa en profundidad).
- **2FA + audit en acciones de riesgo.** Borrar usuario, cambiar email y PATCH de admin exigen 2FA;
  las acciones sensibles registran motivo en el audit log.
- **Sanitización.** El contenido Markdown/rico pasa por `rehype-sanitize` (sin HTML crudo); Mermaid
  corre en `securityLevel: 'strict'`.
- **Assets firmados.** Documentos y facturas se sirven vía enlaces de firma temporal, no URLs públicas.
- **Cabeceras.** `next.config.ts` emite `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy` y HSTS. (CSP pendiente: ver auditoría F3.2.)
- **Sin secretos en el repo.** `.env*` gitignoreado (solo `*.example` commiteado); Sentry sin
  `sendDefaultPii` (no captura cookies/IP).
- **Supply chain.** `npm audit` en cero; `knip` sin deps huérfanas; lockfile reproducible.

El detalle por fases está en [`docs/technical-audit-2026-06-08.md`](./docs/technical-audit-2026-06-08.md).

## Versiones soportadas

Se mantiene con parches de seguridad la rama `main` (release activa).
