# Changelog

Todos los cambios notables de **kodi-admin** se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).
Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/) + gitmoji.

## [Unreleased]

Base de producción reconstruida en un historial limpio por fases (2026-06-08).
La historia previa (20+ ramas de desarrollo) quedó archivada en un backup `git bundle`
fuera del repositorio.

### Changed
- **Auditoría Fase 2 (arquitectura) · `app/api/admin/`:** los handlers `admins` y `audit-log/by-resource` dejan de reinventar el proxy BFF con `fetch` a mano y pasan a `forwardToBackend` (forma canónica idéntica a los otros 214). Además corrige el colapso de query params repetidos (`?country=CR&country=GT`) que el bucle `searchParams.set` perdía.
- **Auditoría Fase 1 (calidad) · `bots/`:** elimina la lista de países duplicada y hardcodeada en `bots-tabs.tsx`; usa la fuente única `lib/countries.ts` en `pools-tab` y `generate-bots-button`.
- **Auditoría Fase 1 (calidad) · `hooks/` + tooling:** elimina 3 exports muertos (`LEAGUE_TIER_LABELS`, `STATUS_VARIANT`, `FinanceCurrency`) y agrega `knip.json` para que la detección de dead code sea fiable (ignora exports usados en su propio archivo + primitivos shadcn vendados + falsos positivos). El subsistema BFF tipado (`lib/api.ts`) se conserva como intencional → **knip 100% limpio**.
- **Auditoría Fase 1 (calidad) · `lib/`:** reduce la superficie pública — helpers y metadata de uso interno único (`*_STATUS_META`, `LEAGUE_META`, `ROLE_META`, `PLAN_COLOR`, `STATUS_TONE_CLASS`, `gameStatusTone`, `readAccessToken`, tipos `LeagueTier`/`LeagueMeta`/`PlanKey`) dejan de exportarse, consistente con el patrón `DIFFICULTY_META` ya privado. Sin cambio de comportamiento.

### Security
- **Auditoría Fase 3 (hardening) · `next.config.ts`:** agrega cabeceras de seguridad de línea base — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (anti-clickjacking), `Referrer-Policy`, `Permissions-Policy` (deniega cámara/micrófono/geo) y HSTS (`Strict-Transport-Security`). CSP queda pendiente (requiere inventario de orígenes externos; ver F3.2 en la auditoría).

### Fixed
- **CI / tests:** vitest pasa al pool `threads`. El pool `forks` por defecto a veces no arrancaba sus workers en Windows (`Timeout waiting for worker to respond`) y dejaba `npm run ci` **en verde sin correr los tests** — agujero de CI peligroso, detectado en el gate de salida de la Fase 1.

### Added
- Fundación del proyecto: scaffold Next 16 + TypeScript estricto + tooling (ESLint, Vitest, Playwright, Sentry, CI).
- Principios de ingeniería y estándares de release ([`PRINCIPLES.md`](./PRINCIPLES.md)).
- Sistema de diseño (tokens de marca + primitivos shadcn) y catálogo de componentes compartidos.
- Capa BFF (`/api/admin/*`) + hooks de datos (TanStack Query) tipados desde OpenAPI.
- Panel de administración completo (auth + dominios: usuarios, contenido, economía, moderación, mensajería, juego, sistema).
- Framework de auditoría técnica por fases ([`docs/technical-audit-2026-06-08.md`](./docs/technical-audit-2026-06-08.md)).

[Unreleased]: https://example.com/kodi-admin/tree/main
