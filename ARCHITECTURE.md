# Arquitectura — kodi-admin

Panel administrativo de Kodi sobre **Next.js 16** (App Router, RSC). Para convenciones de código y
decisiones con rationale, ver [`AGENTS.md`](./AGENTS.md).

## Vista general

```
Browser (Client Components)
   │  fetch same-origin
   ▼
/api/admin/*  ──  route handlers BFF (proxies finos)
   │  forwardToBackend: reenvía cookie HTTP-only + body + query + status
   ▼
Backend NestJS  /v1/admin/*   ←  autoridad de autenticación y autorización
```

El browser **nunca** habla cross-origin con el backend. Las cookies de sesión (`admin_at`/`admin_rt`)
son HTTP-only y viven en el origen del frontend; el BFF las reenvía server-side.

## Capas

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Rutas auth | `app/(auth)/` | login, change-password, 2FA |
| Panel | `app/(panel)/` | layout con guard + páginas (Server Components) |
| BFF | `app/api/admin/*` | route handlers proxy → backend (`forwardToBackend`) |
| Núcleo | `lib/` | `proxy`/`auth`/`bff`, `guard` (`requireAction`), `permissions`, `signed-asset` |
| Datos | `hooks/use-*.ts` | TanStack Query por dominio contra `/api/admin/*` |
| UI | `components/ui/` (shadcn) + `components/admin/` (catálogo propio) | primitivos + componentes |
| Contrato | `types/api.ts` | tipos generados de OpenAPI (gate `gen:types:check`) |

## Flujo de una request

1. Una página del panel es un **Server Component** que llama `requireAction(action)`
   (`lib/guard.ts`): valida sesión vía cookie y redirige (`/login`, `/change-password` o `/`) si falta
   auth/permiso. La autoridad real es el backend; esto es UX.
2. Los **Client Components** fetchean con hooks de TanStack Query contra `/api/admin/*`.
3. El route handler BFF reenvía la request al backend con `forwardToBackend(req, method, path)`,
   propagando la cookie HTTP-only, el body, el query string y el status.
4. El backend aplica sus guards (`@RequireRole`/`@RequireGlobalScope`) y responde envuelto en
   `{ data: T }` (se desenvuelve con `unwrapData`).

## Autorización (defensa en profundidad)

- **Backend = autoridad.** Rechaza toda request sin permiso, sin importar la UI.
- **Frontend = gating de UX.** `can`/`canWithScope` (`lib/permissions.ts`) ocultan/muestran y
  `requireAction` evita renderizar páginas sin permiso. Una matriz RBAC por rol + un set de acciones
  que exigen scope global.
- **Acciones de riesgo**: 2FA obligatorio (borrar usuario, cambiar email, PATCH admin) + motivo →
  audit log.

## Datos y tipos

- `types/api.ts` se genera del spec OpenAPI del backend (gate de drift en CI) y alimenta el andamiaje
  tipado `serverApi` (`lib/api.ts`).
- Los hooks usan **tipos hand-rolled** contra el fetch crudo del BFF (tradeoff aceptado; ver
  `AGENTS.md` §Decisiones). `queryKey` namespaced + invalidación tras cada mutación de estado;
  optimistic updates con rollback donde aplica (`features`, `sponsors`).

## Observabilidad

Sentry en las 3 runtimes (server/edge vía `instrumentation.register`, client vía
`instrumentation-client`) + `onRequestError` (RSC/handlers) + `onRouterTransitionStart`. DSN-gated,
sin PII. Boundaries: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`.
