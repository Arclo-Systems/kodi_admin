# Changelog

Todos los cambios notables de **kodi-admin** se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).
Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/) + gitmoji.

## [Unreleased]

### Security
- **Indexación · panel interno:** `X-Robots-Tag: noindex, nofollow` (next.config) + `app/robots.ts` con `Disallow: /` → el admin nunca se indexa en buscadores, independiente del dominio (Vercel solo agrega noindex en `*.vercel.app`; con dominio propio hay que declararlo). Detectado en `/seo-audit`.

### Changed
- **Metadatos:** OpenGraph + Twitter Card con título/descripción e imagen 1200×630 (`public/open-graph.png`) para previews de link del panel; `metadataBase` derivado del dominio de producción de Vercel.
- **Deploy:** `vercel.json` (región `iad1`) para servir el panel desde us-east, cerca del backend.

## [0.2.0] - 2026-06-09

Endurecimiento para producción: auditoría técnica por fases (calidad, arquitectura, seguridad,
performance, accesibilidad, tests, dependencias, observabilidad, docs y release) sobre la base
v0.1.0. 13 hallazgos, 12 corregidos; 1 Required diferido (CSP, requiere infra de despliegue).

### Changed
- **Facturas de sponsor · editor de líneas (borrador):** agrega encabezados de columna (Descripción / Origen / Cant. / P. Unit.) alineados a la grilla y labels sobre las fechas (Vencimiento / Período facturado), con separación visual — antes el campo de vencimiento se veía suelto y sin contexto.
- **Auditoría Fase 11 (CI) · `.github/workflows/ci.yml`:** los jobs corren en **Node 24** (coherente con el campo `engines`) y se agregan gates de `npm audit --audit-level=high` y `npx knip@6`.
- **Auditoría Fase 5 (performance) · dashboard:** los 3 charts (recharts, ~308 KB) se cargan con `next/dynamic` (`ssr: false`) en un chunk aparte, fuera del bundle inicial de la landing. Están below-the-fold (debajo de los KPIs), así que el lazy-load no afecta el LCP; el fallback ocupa el mismo alto para no causar CLS.
- **Auditoría Fase 2 (arquitectura) · `app/api/admin/`:** los handlers `admins` y `audit-log/by-resource` dejan de reinventar el proxy BFF con `fetch` a mano y pasan a `forwardToBackend` (forma canónica idéntica a los otros 214). Además corrige el colapso de query params repetidos (`?country=CR&country=GT`) que el bucle `searchParams.set` perdía.
- **Auditoría Fase 1 (calidad) · `bots/`:** elimina la lista de países duplicada y hardcodeada en `bots-tabs.tsx`; usa la fuente única `lib/countries.ts` en `pools-tab` y `generate-bots-button`.
- **Auditoría Fase 1 (calidad) · `hooks/` + tooling:** elimina 3 exports muertos (`LEAGUE_TIER_LABELS`, `STATUS_VARIANT`, `FinanceCurrency`) y agrega `knip.json` para que la detección de dead code sea fiable (ignora exports usados en su propio archivo + primitivos shadcn vendados + falsos positivos). El subsistema BFF tipado (`lib/api.ts`) se conserva como intencional → **knip 100% limpio**.
- **Auditoría Fase 1 (calidad) · `lib/`:** reduce la superficie pública — helpers y metadata de uso interno único (`*_STATUS_META`, `LEAGUE_META`, `ROLE_META`, `PLAN_COLOR`, `STATUS_TONE_CLASS`, `gameStatusTone`, `readAccessToken`, tipos `LeagueTier`/`LeagueMeta`/`PlanKey`) dejan de exportarse, consistente con el patrón `DIFFICULTY_META` ya privado. Sin cambio de comportamiento.

### Security
- **Auditoría Fase 8 (supply chain) · dependencias:** `overrides` de `postcss ^8.5.15` para subir el postcss que Next bundlea (advisory `<8.5.10`, XSS build-time no alcanzable) → `npm audit` queda en **0 vulnerabilidades**. Agregado campo `engines` (Node `^22.22.2 || ^24.15.0 || >=26`).
- **Auditoría Fase 3 (hardening) · `next.config.ts`:** agrega cabeceras de seguridad de línea base — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (anti-clickjacking), `Referrer-Policy`, `Permissions-Policy` (deniega cámara/micrófono/geo) y HSTS (`Strict-Transport-Security`). CSP queda pendiente (requiere inventario de orígenes externos; ver F3.2 en la auditoría).

### Fixed
- **Auditoría Fase 7 (e2e) · `playwright.config.ts`:** en CI el `webServer` pasa a `npm run build && npm run start` (build de producción, rutas pre-compiladas) en vez de `npm run dev`. Bajo carga paralela, `next dev` compila on-demand y se satura → timeouts masivos que no son bugs (verificado: la suite pasa en serie). En local sigue reusando el dev server.
- **Contrato de tipos:** `types/api.ts` re-sincronizado con el spec OpenAPI del backend (`gen:types:check` detectó drift al validar con el backend arriba).
- **CI / tests:** vitest pasa al pool `threads`. El pool `forks` por defecto a veces no arrancaba sus workers en Windows (`Timeout waiting for worker to respond`) y dejaba `npm run ci` **en verde sin correr los tests** — agujero de CI peligroso, detectado en el gate de salida de la Fase 1.

### Added
- **Higiene de repo (release):** `LICENSE` (propietario), `SECURITY.md` (política + reporte de vulnerabilidades), `ARCHITECTURE.md` (capas BFF + flujo + permisos), `CONTRIBUTING.md` (flujo + commits) y `commitlint.config.cjs` (Conventional Commits + gitmoji). README reescrito (tech-stack, comandos, links). `license: "UNLICENSED"` en `package.json`.
- **Auditoría Fase 10 (docs) · `AGENTS.md` + `.env.local.example`:** crea `AGENTS.md` (instrucciones de agente/contribución con arquitectura, convenciones, 3 decisiones de arquitectura y gotchas) que `CLAUDE.md` importaba sin que existiera; crea `.env.local.example` que el README referenciaba. Corrige el path del backend en el README.
- **Auditoría Fase 7 (tests) · unit:** tests de lógica pura con branching — `hasOverlap` (solape de tramos de premio, espejo de la validación del backend) y `offerStatus` (estado de la ventana de oferta de kokos-packs). De 9 a 20 tests unitarios.

## [0.1.0] - 2026-06-08

Fundación del proyecto. Historial reconstruido limpio por fases; la historia previa (20+ ramas de
desarrollo) quedó archivada en un backup `git bundle` fuera del repositorio.

### Added
- Scaffold Next 16 + TypeScript estricto + tooling (ESLint, Vitest, Playwright, Sentry, CI).
- Sistema de diseño (tokens de marca + primitivos shadcn) y catálogo de componentes compartidos.
- Capa BFF (`/api/admin/*`) + hooks de datos (TanStack Query) tipados desde OpenAPI.
- Panel de administración completo (auth + dominios: usuarios, contenido, economía, moderación, mensajería, juego, sistema).
- Framework de auditoría técnica por fases ([`docs/technical-audit-2026-06-08.md`](./docs/technical-audit-2026-06-08.md)).

[Unreleased]: https://github.com/Arclo-Systems/kodi_admin/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Arclo-Systems/kodi_admin/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Arclo-Systems/kodi_admin/releases/tag/v0.1.0
