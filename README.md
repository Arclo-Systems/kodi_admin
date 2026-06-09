<div align="center">

# kodi-admin

**Panel administrativo de Kodi** — Next.js 16 (App Router · RSC) + shadcn/ui (Tailwind v4)

Consume el namespace `/v1/admin/*` del backend NestJS hermano (`../backend`) a través de una capa
BFF propia, same-origin.

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

</div>

---

## ✨ Qué incluye

- **Auth** con login, cambio de contraseña forzado y 2FA en acciones de riesgo.
- **Dominios completos**: usuarios, contenido, economía, monetización, moderación, mensajería, juego,
  bots, finanzas y sistema (admins, audit-log, jobs, health).
- **BFF tipado** (`/api/admin/*`) + datos con TanStack Query; permisos RBAC con scope por país.
- **Estricto y observable**: TypeScript sin `any`, Sentry en las 3 runtimes, `npm audit` en cero.

## 🧱 Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Turbopack) |
| Lenguaje | TypeScript estricto (sin `any`) |
| UI | shadcn/ui + Tailwind v4 · forms con `Field` + react-hook-form + zod |
| Datos | TanStack Query (client) · BFF `/api/admin/*` (server) |
| Tests | Vitest (unit) · Playwright (e2e) |
| Observabilidad | Sentry (server/edge/client) |

## 🚀 Setup

```bash
cp .env.local.example .env.local   # completá NEXT_PUBLIC_API_URL
npm install
npm run gen:types                  # genera types/api.ts desde el backend hermano
npm run dev                        # http://localhost:3001
```

> Requiere Node ≥ 24.15 (ver `engines`) y el backend hermano en `../backend`.

## 📁 Estructura

```
app/(auth)/        login · change-password · 2fa
app/(panel)/       layout (guard) + páginas del panel (Server Components)
app/api/admin/     route handlers BFF (proxy same-origin → backend)
lib/               proxy · auth · bff · guard · permissions · signed-asset
hooks/             TanStack Query por dominio (use-*.ts)
components/ui/     primitivos shadcn (vendados)
components/admin/  catálogo propio (DataTable, KpiCard, ConfirmDialog, TwoFaDialog…)
types/api.ts       tipos generados de OpenAPI (gate de drift en CI)
```

Detalle en [`ARCHITECTURE.md`](./ARCHITECTURE.md). Convenciones y decisiones en [`AGENTS.md`](./AGENTS.md).

## 🛠️ Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | dev server (puerto 3001) |
| `npm run gen:types` | regenera `types/api.ts` (local: backend hermano; CI: `KODI_API_URL`) |
| `npm test` | unit tests (Vitest) |
| `npm run e2e` | e2e tests (Playwright) |
| `npm run ci` | lint + typecheck + test + build (lo que corre en CI) |

## 🔁 CI

`.github/workflows/ci.yml` corre en cada PR/push: lint, typecheck, test, `gen:types:check` (falla si
`types/api.ts` quedó desincronizado del backend), build y e2e. El backend tiene su propio
`backend-ci.yml`.

## 📦 Deploy

**Variables de entorno (producción)**

- `NEXT_PUBLIC_API_URL` — backend Kodi (ej. `https://api.kodi.app`)
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN del panel
- `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` — upload de source maps en build
- `OPENAPI_TOKEN` — solo CI, para `gen:types` contra la API de prod

**Secrets de GitHub Actions**: `STAGING_API_URL`, `PROD_API_URL`, `OPENAPI_TOKEN`, `SENTRY_DSN`,
`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.

**Hosting**: pendiente de decisión (Vercel / Render / Cloudflare Pages). El scaffold no asume ninguno.

## 🤝 Contribuir & seguridad

- Flujo, commits y estilo: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Reporte de vulnerabilidades y postura de seguridad: [`SECURITY.md`](./SECURITY.md)
- Auditoría técnica por fases: [`docs/technical-audit-2026-06-08.md`](./docs/technical-audit-2026-06-08.md)

## 📄 Licencia

Propietario — © 2026 Arclo Systems. Ver [`LICENSE`](./LICENSE).
