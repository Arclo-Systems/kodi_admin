# AGENTS.md — kodi-admin

Guía para agentes y contribuidores. Para setup/comandos/deploy, ver [`README.md`](./README.md).
Reglas de diseño visual en [`DESIGN.md`](./DESIGN.md).

## Qué es

Panel administrativo de Kodi: **Next.js 16** (App Router, RSC) + TypeScript estricto + shadcn/ui
(Tailwind v4). Consume el namespace `/v1/admin/*` del backend NestJS hermano (`../backend`) a través
de una capa **BFF** propia (`app/api/admin/*`), nunca cross-origin desde el browser.

## Definición de "hecho"

Antes de dar algo por terminado: **`npm run ci`** verde (lint + typecheck + test + build) y, si tocaste
dependencias, **`npx knip`** limpio + **`npm audit`** sin críticas/altas. Cero `any`, cero warnings nuevos.

## Arquitectura (capas)

- **`app/(auth)`** — login, change-password, 2FA. **`app/(panel)`** — el panel; `layout.tsx` exige
  autenticación (redirige a `/login`) y cambio de contraseña forzado.
- **`app/api/admin/*`** — route handlers BFF. Son **proxies finos**: `forwardToBackend(req, method, path)`
  (`lib/proxy.ts`) reenvía cookie + body + query + status al backend. El browser pega a `/api/admin/*`
  **same-origin**; las cookies HTTP-only nunca salen al cliente.
- **`lib/`** — `proxy.ts`/`auth.ts`/`bff.ts` (núcleo BFF), `guard.ts` (`requireAction`), `permissions.ts`
  (`can`/`canWithScope`), `signed-asset.ts`, status maps. `lib/` **no importa de `app/`**.
- **`hooks/use-*.ts`** — TanStack Query por dominio. **`components/ui/`** — primitivos shadcn (vendados,
  no se editan a mano). **`components/admin/`** — catálogo propio sobre los primitivos.
- **`types/api.ts`** — tipos generados de OpenAPI (gate `gen:types:check` en CI).

## Convenciones

- **TypeScript estricto, cero `any`** — usar tipos propios, generics o `unknown`. `noUnusedLocals`/
  `noUncheckedIndexedAccess` activos.
- **UI = shadcn**: se arma con primitivos del registry, luego se personalizan. No se escribe UI a mano.
- **Forms**: familia `Field` (`components/ui/field.tsx`) + `react-hook-form` + `zodResolver`. (No existe
  el `Form`/`FormField` legacy en este style.) Patrón `values` de RHF para resetear desde data async.
- **Datos**: Server Components con guard (`requireAction`) + fetch server-side (`adminFetch`); Client
  Components con hooks de TanStack Query contra `/api/admin/*`. `queryKey` namespaced; invalidar tras
  toda mutación de estado.
- **Errores**: los helpers `send*` lanzan `Error(message del backend)` → toast/`Alert` accionable.
  Nunca `catch {}` que trague.
- **Comentarios**: solo el *por qué* (intención no obvia), nunca narrar el *qué*.

## Decisiones de arquitectura (rationale)

1. **BFF con authz en el backend.** Los 220 route handlers son proxies que reenvían la cookie; la
   **autoridad de autorización es el backend** (`@RequireRole`/`@RequireGlobalScope`). `permissions.ts`
   (`can`/`canWithScope`) es **solo gating de UX** (mostrar/ocultar) — defensa en profundidad, no la
   frontera de seguridad. No se duplica authz en los proxies (evita drift).
2. **Tipos: OpenAPI + hand-rolled.** `types/api.ts` se genera del spec (gate de drift en CI) y alimenta
   el andamiaje tipado `serverApi` (`lib/api.ts`). El panel hoy pega vía fetch crudo con **tipos
   hand-rolled** en los hooks — tradeoff aceptado (backend first-party). Correr `gen:types:check` si el
   backend cambió contratos.
3. **Acciones de riesgo con 2FA + audit.** Borrar usuario, cambiar email y PATCH de admin exigen
   `TwoFaDialog`; las acciones sensibles piden motivo → audit log. Assets sensibles (docs/facturas) vía
   firma temporal (`openSignedAsset`), no URLs públicas.

## Gotchas

- **`forwardToBackend` propaga query con `?${qs}`** — usá la forma canónica, no `fetch` a mano (colapsa
  query params repetidos).
- **204**: el proxy lo maneja; algunos handlers de auth devuelven `{ ok: true }`.
- **Sentinel `NaN`** para inputs numéricos opcionales en forms; **`DEFAULT`/`KEEP`** como sentinels de
  Select donde Radix no admite valor vacío.
- **Rangos de fecha en charts**: truncar a la hora (`hourIso`) para estabilizar la `queryKey` y evitar
  refetch en bucle.
- **recharts es pesado** (~300 KB): cargarlo con `next/dynamic` si está below-the-fold (ver dashboard).
- **Markdown**: `rich-content`/`markdown-view` van con `rehype-sanitize` (sin `rehype-raw`); no introducir
  HTML crudo de input de usuario.

## Auditoría técnica

El estado de calidad/seguridad/perf por fases vive en
[`docs/technical-audit-2026-06-08.md`](./docs/technical-audit-2026-06-08.md). Required abierto: CSP (F3.2).
