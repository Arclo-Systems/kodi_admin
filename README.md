# kodi-admin

Panel administrativo de Kodi — Next.js 16 (App Router) + shadcn/ui (Tailwind v4).
Consume el namespace `/v1/admin/*` del backend NestJS (`../kodi_app/backend`).

## Setup

```bash
cp .env.local.example .env.local
npm install
npm run gen:types   # genera types/api.ts desde el backend hermano
npm run dev         # http://localhost:3001
```

## Estructura

- `app/(auth)/` — login, change-password, 2fa
- `app/(panel)/` — layout principal + páginas del panel
- `app/api/admin/` — route handlers BFF (proxy same-origin al backend, reenvían cookies)
- `lib/` — `api.ts` (cliente openapi-fetch server-side), `utils.ts`
- `hooks/` — hooks de TanStack Query por área
- `components/ui/` — primitives de shadcn (descargados, no escritos a mano)
- `components/admin/` — componentes propios del panel (sobre los primitives)
- `types/api.ts` — tipos generados de OpenAPI (commiteado; drift gate en CI)

## Convenciones

- **100% shadcn**: la UI se arma con componentes de shadcn descargados del registry, luego se personalizan. No se escribe UI a mano.
- **Forms**: este proyecto usa el style `radix-nova`, cuyo primitivo de formularios es la familia `Field` (`components/ui/field.tsx`) + `react-hook-form` + `zodResolver`. (El `form`/`FormField` legacy no existe en este style.)
- **Datos**: Server Components vía `serverApi()`; Client Components vía hooks de TanStack Query contra `/api/admin/*` (BFF).

## Comandos

- `npm run dev` — dev server (puerto 3001)
- `npm run gen:types` — regenera `types/api.ts` (local: backend hermano; CI: `KODI_API_URL`)
- `npm test` — unit tests (Vitest)
- `npm run e2e` — E2E tests (Playwright)
- `npm run ci` — lint + typecheck + test + build (lo que corre en CI)

## CI

`.github/workflows/ci.yml` corre en cada PR/push: lint, typecheck, test, `gen:types:check` (regenera `types/api.ts` contra la API y falla si hay drift), build y E2E. El backend tiene su propio `backend-ci.yml`.

## Deploy

### Variables de entorno (producción)

- `NEXT_PUBLIC_API_URL` — backend Kodi (ej. `https://api.kodi.app`)
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN del panel
- `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` — upload de source maps en build
- `OPENAPI_TOKEN` — solo CI, para `gen:types` contra la API de prod

### Secrets de GitHub Actions

`STAGING_API_URL`, `PROD_API_URL`, `OPENAPI_TOKEN`, `SENTRY_DSN`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.

### Hosting

**Pendiente de decisión** (Vercel / Render / Cloudflare Pages). El scaffold no asume ninguno; al elegir se ajusta el workflow de deploy.

