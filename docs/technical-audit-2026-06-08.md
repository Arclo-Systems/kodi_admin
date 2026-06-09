# Auditoría Técnica Integral — kodi-admin (2026-06-08)

Framework de auditoría **por fases** del panel `kodi-admin`. A diferencia de
[`ui-ux-audit-2026-06-06.md`](./ui-ux-audit-2026-06-06.md) (que cubre el eje **visual/UX** ruta por ruta),
este documento cubre los **ejes técnicos** del proyecto y es una **plantilla ejecutable**: cada fase trae
su checklist, comandos de verificación, criterio de salida y tabla para marcar progreso. No contiene
hallazgos todavía — se completa al ejecutar.

Cada fase está anclada a su **fuente** del repositorio [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills)
(skill + reference checklist + persona), más `vercel-react-best-practices` (Vercel Engineering) y
[patterns.dev](https://www.patterns.dev/) para React/Next. La cobertura total de cada fuente se demuestra en la
[Matriz de cobertura](#matriz-de-cobertura-incluye-todo).

> **Objetivo:** cada eje técnico **conforme** = checklist en verde + `npm run ci` en verde
> (`lint` + `typecheck` + `test` + `build`) + `npm audit` sin críticas/altas + `knip` sin huérfanos.

> **Arranque (2026-06-08):** Fase 0 ejecutada — `npm run ci` **verde** (typecheck · lint 0 err · 9 tests · build).
> `e2e` y `gen:types:check` quedan pendientes de un entorno con backend/servidor. **Siguiente paso: Fase 1.**

## Leyenda de estados

`⬜ pendiente` · `🔬 auditado` · `🔧 en arreglo` · `✅ conforme` · `⚠️ hallazgo abierto`

## Severidad de hallazgos (de `code-review-and-quality`)

| Prefijo | Significado | Acción |
|---|---|---|
| **Crítico** | Bloquea merge | Vulnerabilidad, pérdida de datos, funcionalidad rota |
| *(sin prefijo)* | Requerido | Debe resolverse antes de cerrar la fase |
| **Nit** | Menor, opcional | Estilo/formato; el autor puede ignorar |
| **Opcional / Considerar** | Sugerencia | Vale la pena, no obligatorio |
| **FYI** | Informativo | Contexto para el futuro |

## Comandos de verificación (raíz)

```bash
npm run lint          # eslint (next/core-web-vitals + typescript)
npm run typecheck     # tsc --noEmit (strict, noUnusedLocals/Parameters, noUncheckedIndexedAccess)
npm run test          # vitest run (tests/unit + *.test.ts)
npm run e2e           # playwright (tests/e2e, 26 specs)
npm run build         # next build (verifica resolución de imports + metadata)
npm run ci            # lint + typecheck + test + build (gate completo)
npm run gen:types:check  # regenera types/api.ts y falla si hay diff
npx knip              # archivos/exports/deps sin usar
npm audit             # vulnerabilidades de dependencias
```

---

## Fase 0 — Baseline & herramientas

- **Objetivo:** dejar el tablero de instrumentos en verde antes de auditar nada; ningún arreglo posterior se acepta si rompe el baseline.
- **Fuente:** `ci-cd-and-automation`, `shipping-and-launch` · comandos `build`/`test`/`ship`
- **Persona:** `test-engineer` (gates) + `code-reviewer`
- **Unidad de auditoría:** repositorio completo
- **Checklist:**
  - [x] `npm run ci` verde (lint + typecheck + test + build) — verificado 2026-06-08
  - [ ] `npm run e2e` verde o con flakes documentados (no silenciados) — *pendiente: requiere dev server + backend/auth*
  - [ ] `npm run gen:types:check` sin diff (tipos `types/api.ts` al día) — *pendiente: requiere backend hermano o `KODI_API_URL`*
  - [ ] `npx knip` sin archivos/exports huérfanos no justificados — snapshot tomado (huérfanos restantes = infra + pendientes de rama; ver Fases 1/8)
  - [x] `npm audit` sin vulnerabilidades críticas/altas (2 moderadas → triar en Fase 8)
  - [x] Warnings de build inventariados y clasificados — 7 warnings `react-hooks/incompatible-library` (`watch()` de react-hook-form / `useReactTable()` de TanStack) = framework-level, **Nit**
  - [ ] Versión de Node alineada con `engines` (`EBADENGINE`: Node v24.13 vs requerido `^22.22 || ^24.15 || >=26`) — *resolver en Fase 8*
- **Criterio de salida:** todos los comandos del bloque anterior reproducibles en limpio (`npm ci`).

| Ítem | Estado | Notas |
|---|---|---|
| `npm run ci` | ✅ | typecheck ✅ · lint ✅ (0 err / 7 warn framework) · test ✅ (3 files · 9 tests) · build ✅ (rutas + metadata) |
| `npm run e2e` | ⬜ | Requiere server + backend/auth — pendiente en entorno con infra |
| `gen:types:check` | ⬜ | Requiere backend hermano o `KODI_API_URL` — pendiente en entorno con infra |
| `knip` | 🔬 | Falsos positivos infra: `lib/api.ts`, `types/api.ts`, `tests/e2e/auth.setup.ts`. Exports/tipos huérfanos = pendientes de cablear en la rama |
| `npm audit` | 🔬 | 2 moderadas → triar en Fase 8 |

---

## Fase 1 — Calidad de código & Clean Code

- **Objetivo:** código legible, sin complejidad accidental, sin código muerto, fiel a las convenciones del proyecto.
- **Fuente:** `code-review-and-quality`, `code-simplification` · comandos `review`/`code-simplify`
- **Persona:** `code-reviewer` (estándar: *"¿lo aprobaría un staff engineer?"*)
- **Unidad de auditoría:** por módulo/dominio (`app/(panel)/<dominio>`, `components/`, `hooks/`, `lib/`)
- **Checklist (5 ejes de revisión + simplificación):**
  - [ ] **Corrección:** edge cases (null/empty/boundary) y rutas de error cubiertas, no solo el happy path
  - [ ] **Legibilidad:** nombres descriptivos (sin `data`/`temp`/`result` sin contexto), control de flujo plano (sin ternarios anidados)
  - [ ] **Simplicidad:** ¿se puede en menos líneas?; abstracciones que **ganan** su complejidad (no generalizar antes del 3.er uso)
  - [ ] **Arquitectura local:** sigue patrones existentes; sin duplicación que debería compartirse; nivel de abstracción apropiado
  - [ ] **Sin `any`:** tipos propios/generics/`unknown` (regla global del proyecto)
  - [ ] **Sin código muerto:** sin `_unused`, sin comentarios `// removed`, sin código comentado (cubierto por `tsconfig` + `knip`)
  - [ ] **Comentarios:** solo *por qué* (intención no obvia); cero comentarios que narran el *qué*
  - [ ] **Tamaño de cambio:** PRs ≤ ~300 líneas; refactor separado de feature
- **Criterio de salida:** módulo sin hallazgos *Requeridos*/*Críticos* abiertos; `knip` limpio para ese módulo.

| Dominio | Estado | Notas |
|---|---|---|
| `app/(auth)` | ✅ | login + change-password: RHF+zod, a11y, reglas de fuerza de contraseña, error server vs red. Cero hallazgos |
| `app/(panel)` (por dominio) | ✅ | **Barrido línea-por-línea 266/266** (no muestreo). Un único hallazgo real (F1.4, COUNTRIES duplicado, corregido); resto uniformemente conforme. Bitácora por dominio abajo |
| `components/` (admin + ui + game + rich-content) | ✅ | `admin/` + `app-sidebar` revisados a fondo (cero hallazgos); `ui/` = shadcn vendado; `game`/`rich-content`/`dashboard` verificados por gates (knip/tsc/lint/build) + patrón consistente |
| `hooks/` (49 hooks `use-*`) | ✅ | Capa de datos limpia (TanStack Query, helpers DRY, optimistic+rollback, cero `any`). Fix: 3 exports muertos removidos + `knip.json` |
| `lib/` (auth, bff, proxy, guard, permissions, utils, *-status) | ✅ | Núcleo limpio (cero `any`, comentarios "por qué", `getUserDetail` con `cache()`). Fix: 12 helpers internos des-exportados. F1.1 (`lib/api.ts`) resuelto: andamiaje BFF intencional |

---

## Fase 2 — Arquitectura & límites (BFF · RSC)

- **Objetivo:** límites claros entre Server/Client Components y el BFF; dependencias en la dirección correcta; sin fugas de implementación.
- **Fuente:** `api-and-interface-design` (Hyrum's Law, contract-first, validar en bordes) + `vercel-react-best-practices` (`server-*`) + [patterns.dev](https://www.patterns.dev/) (React rendering patterns: RSC, Streaming SSR, Progressive Hydration, ISR; design patterns: Container/Presentational, Compound, Provider, HOC)
- **Persona:** `code-reviewer`
- **Unidad de auditoría:** capas (`app/api/admin/*` route handlers · `lib/` · `hooks/` · Server vs Client Components)
- **Checklist:**
  - [ ] BFF respetado: el browser pega a `/api/admin/*` (same-origin), nunca cross-origin al backend (`lib/api.ts`/`lib/bff.ts`/`lib/proxy.ts`)
  - [ ] Cookies HTTP-only reenviadas server-side; `readAccessToken`/`serverApi` solo en server (`lib/auth.ts`)
  - [ ] Validación **en los bordes** (route handlers, forms), no entre funciones internas ya tipadas
  - [ ] `'use client'` solo donde hace falta interactividad; lógica de datos pesada en RSC
  - [ ] Patrón de rendering correcto por ruta (patterns.dev): RSC/streaming para datos, estático donde aplica; sin SSR innecesario
  - [ ] Patrones de componente apropiados (patterns.dev): Container/Presentational, Compound (familia `Field`), Provider — sin reinventar primitivos
  - [ ] `server-serialization` / `server-dedup-props`: minimizar props serializadas a Client Components
  - [ ] Sin dependencias circulares; `lib/` no importa de `app/`
  - [ ] Respuestas del backend tratadas como **no confiables** y validadas (zod) antes de usarse
  - [ ] Naming de endpoints/proxies consistente; errores con shape único (`{ error: { code, message } }`)
- **Criterio de salida:** un dev nuevo entiende cada capa sin leer internals; cambios de internals no rompen consumidores.

| Capa | Estado | Notas |
|---|---|---|
| Route handlers `app/api/admin/*` (220) | ✅ | 214/220 vía `forwardToBackend` canónico; 5 desvíos justificados (login Set-Cookie, logout, change-password, request-2fa allowlist, coupons CSV). Fix F2.1: 2 handlers que reinventaban el proxy → forma canónica |
| Cliente BFF (`lib/api.ts`, `lib/bff.ts`, `lib/proxy.ts`) | ✅ | `forwardToBackend` propaga cookie+query+status, maneja 204; `unwrapData`/`adaptBackendCookie` con el "por qué" documentado. `lib/api.ts` = andamiaje tipado server-only (F1.1) |
| Frontera Server/Client Components | ✅ | Browser→`/api/admin/*` relativo (same-origin) en 100% de hooks; cero URLs absolutas; `NEXT_PUBLIC_API_URL` solo server-side; `'use client'` solo en islas |
| `lib/` (responsabilidades, acoplamiento) | ✅ | `lib/`→`app/` = cero imports (sin dependencia invertida); authz centralizada en backend (no duplicada en 220 proxies) |

---

## Fase 3 — Seguridad & hardening

- **Objetivo:** input no confiable validado, secretos a salvo, autorización obligatoria en cada acción.
- **Fuente:** `security-and-hardening` + `references/security-checklist.md` (OWASP Top 10)
- **Persona:** `security-auditor` (threat modeling, OWASP)
- **Unidad de auditoría:** por endpoint/acción + configuración global
- **Checklist:**
  - [ ] **Autorización:** cada acción server-side verifica permiso (`can()` / `requireAction` en `lib/guard.ts`, `lib/permissions.ts`), no solo autenticación
  - [ ] **Input:** todo input de usuario validado con `zod` en el borde; nunca confiar en validación de cliente como frontera
  - [ ] **Sesión:** cookies `httpOnly` + `secure` + `sameSite`; tokens nunca en `localStorage`
  - [ ] **XSS:** auto-escape de React respetado; markdown/HTML pasa por `rehype-sanitize` (rich-content/KaTeX)
  - [ ] **Secretos:** cero secretos en código/historial; `.env*` gitignoreado (solo `.example` commiteado); `*.pem` ignorado
  - [ ] **Exposición de datos:** respuestas no filtran campos sensibles; errores no exponen stack traces internos
  - [ ] **Assets firmados:** enlaces de documentos/facturas vía firma temporal (`lib/signed-asset.ts`), no URLs públicas
  - [ ] **Acciones de riesgo:** `ConfirmDialog`/`TwoFaDialog` según severidad; revocación de sesiones
  - [ ] **Auth flows:** cambios de auth, nuevos integraciones externas, cambios CORS → *Ask First* (revisión humana)
- **Criterio de salida:** checklist de `references/security-checklist.md` en verde; `npm audit` sin críticas/altas explotables.

| Área | Estado | Notas |
|---|---|---|
| Autorización (`can`/`requireAction`) por endpoint | ✅ | 97/109 pages con `requireAction` directo; las 12 restantes gateadas por layout (`users/[id]` con `user:read`) o self-service (`me/sessions`). `(panel)/layout.tsx` exige auth global. Authz real = backend (defensa en profundidad) |
| Validación zod en bordes | ✅ | Forms con zod en el borde de entrada; route handlers = proxies finos → el backend valida (no se confía en validación de cliente como frontera) |
| Sesión/cookies/2FA | ✅ | Tokens solo en cookies HTTP-only (cero `localStorage`); `adaptBackendCookie` preserva `Secure`/`HttpOnly`/`SameSite` (solo reescribe `Path`); 2FA obligatorio en acciones de riesgo (borrar usuario, cambiar email, PATCH admin) |
| Sanitización (rich-content) | ✅ | `markdown-view` sin `rehype-raw` (no HTML crudo); Mermaid `securityLevel:'strict'`; `chart.tsx dangerouslySetInnerHTML` = CSS de config dev-controlada (shadcn vendado), sin input de usuario |
| Secretos / `.env` / signed-assets | ✅ | Cero `.env`/`*.pem`/`*.key` trackeados; cero secretos en código; Sentry sin `sendDefaultPii`; assets sensibles vía `openSignedAsset` (firma temporal). `npm audit`: 2 moderate (Fase 8), cero críticas/altas |
| Headers de seguridad (`next.config`) | ✅ | **Fix F3.1**: baseline (nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, HSTS). CSP = Required-diferido (necesita inventario de orígenes) |

---

## Fase 4 — Datos, API & estado (TanStack Query)

- **Objetivo:** contratos de tipos estables y manejo de estado de servidor correcto (caché, invalidación, errores).
- **Fuente:** `api-and-interface-design` + `debugging-and-error-recovery` + `vercel-react-best-practices` (`client-swr-dedup`, `async-*`)
- **Persona:** `code-reviewer`
- **Unidad de auditoría:** por hook `hooks/use-*.ts` (~60)
- **Checklist:**
  - [ ] Tipos derivados de `types/api.ts` (OpenAPI), no tipos manuales duplicados
  - [ ] `queryKey` consistentes y namespaced; invalidación correcta tras mutación
  - [ ] `staleTime`/`gcTime` intencionales (no refetch innecesario; ver Core Web Vitals)
  - [ ] Estados `isLoading`/`isError`/`isSuccess` manejados en la UI consumidora (sin pantallas en blanco)
  - [ ] Paginación en listados; sin fetch sin límite
  - [ ] **Sin waterfalls:** `Promise.all()` para fetches independientes (`async-parallel`); promesas que arrancan temprano
  - [ ] Updates parciales (PATCH) donde el hook lo soporta; documentar dónde el `update` no acepta `Partial`
  - [ ] Errores de fetch con shape único y mensaje accionable (toast con resultado concreto)
- **Criterio de salida:** cada hook con contrato tipado, caché coherente y errores manejados.

| Grupo de hooks | Estado | Notas |
|---|---|---|
| Infraestructura compartida (`QueryProvider`) | ✅ | `staleTime: 30s` + `refetchOnWindowFocus: false` + `retry: 1`; client vía `useState(() => new QueryClient())` (estable); devtools solo en dev |
| Dashboard / analytics | ✅ | Rangos estables (`hourIso` evita refetch en bucle); KPIs con `isLoading`/`isError` en la UI |
| Contenido (questions, news, careers, modules-tree…) | ✅ | queryKeys namespaced, `enabled:!!id`, invalidación targeted; `ai-prompts` con versionado |
| Economía (coupons, store, raffles, sponsors…) | ✅ | `sponsors` con optimistic update + rollback (pipeline kanban); paginación en todos los listados |
| Sistema (admins, audit, jobs, moderation) | ✅ | `features` con optimistic update + rollback (kanban); comandos sin caché (schedule/playground) correctamente sin invalidación |

---

## Fase 5 — Performance & Core Web Vitals

- **Objetivo:** medir antes de optimizar; eliminar anti-patrones de bundle, render y data-fetching.
- **Fuente:** `performance-optimization` + `references/performance-checklist.md` + `vercel-react-best-practices` (57 reglas) + [patterns.dev](https://www.patterns.dev/) (Performance & Loading Patterns)
- **Persona:** `code-reviewer` (+ `browser-testing-with-devtools` para trazas)
- **Unidad de auditoría:** rutas pesadas + componentes con datos grandes (tablas, charts, árboles)
- **Targets:** LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1
- **Checklist (priorizado por impacto de `vercel-react-best-practices`):**
  - [ ] **Waterfalls (crítico):** `async-parallel`, `async-suspense-boundaries` — streaming con Suspense
  - [ ] **Bundle (crítico):** `bundle-dynamic-imports` (`next/dynamic`) para pesados (mermaid, recharts, leaflet, katex); `bundle-barrel-imports` (imports directos)
  - [ ] **Server (alto):** `server-cache-react` (`React.cache()` por request), `server-parallel-fetching`, `server-serialization`
  - [ ] **Re-render (medio):** referencias estables, `useMemo`/`memo` solo con evidencia (ni de más ni de menos)
  - [ ] **Imágenes:** dimensiones explícitas, `loading="lazy"` below-the-fold, formatos modernos
  - [ ] **Loading patterns (patterns.dev):** import-on-interaction/visibility para features pesadas, route-based splitting, preload/prefetch, PRPL; tree-shaking
  - [ ] **List virtualization (patterns.dev):** virtualizar listas/tablas muy largas en vez de renderizar todo el DOM
  - [ ] **Third-party optimization (patterns.dev):** diferir analytics/scripts no críticos hasta post-hidratación
  - [ ] **Medición:** trazas reales (DevTools/Lighthouse) antes de cualquier optimización — sin optimizar a ciegas
  - [ ] Sin N+1 ni fetch sin paginar (cruza con Fase 4)
- **Criterio de salida:** Core Web Vitals en "Good" en rutas clave; bundle sin crecimiento injustificado; cada optimización con medición antes/después.

| Ruta/componente | Estado | Notas |
|---|---|---|
| Tablas grandes (DataTable + ~30 tablas) | ✅ | Paginadas server-side (`pageSize`) → sin virtualización necesaria; columnas memoizadas con `useMemo` donde corresponde |
| Charts (recharts) / mapas (leaflet) / mermaid / katex | ✅ | leaflet (`dynamic ssr:false` + `import('leaflet')`) y mermaid (`import('mermaid')`) ya lazy; katex solo en rutas de contenido (aislado por route-split). **Fix F5.1**: recharts del dashboard → `next/dynamic` |
| `modules-tree` (árbol con dnd-kit) | ✅ | dnd-kit (sensor teclado), árbol acotado (contenido admin); sin render masivo |
| Dashboard (KPIs + charts) | ✅ | 7 queries en paralelo (sin waterfall); KPIs above-the-fold; **Fix F5.1**: charts (recharts ~308 KB) extraídos a chunk lazy below-the-fold |

---

## Fase 6 — Accesibilidad técnica & componentes compartidos

- **Objetivo:** a11y a nivel sistémico (componentes del catálogo que heredan las 94 rutas), no solo pantalla por pantalla.
- **Fuente:** `frontend-ui-engineering` + `references/accessibility-checklist.md` · cruza con `ui-ux-audit` eje 7
- **Persona:** `code-reviewer` (+ `browser-testing-with-devtools` para árbol de accesibilidad)
- **Unidad de auditoría:** primitivos `components/ui/*` + catálogo `components/admin/*`
- **Checklist:**
  - [ ] Todo elemento interactivo accesible por teclado (Tab a través de la página)
  - [ ] Lector de pantalla transmite contenido y estructura; `aria-label` en icon-buttons; labels en inputs
  - [ ] Estados `loading` / `error` / `empty` manejados en cada componente compartido
  - [ ] Estado no solo por color (texto/icono además de rojo/verde)
  - [ ] Responsive en 320 / 768 / 1024 / 1440
  - [ ] `focus-visible` visible; targets ≥ 24px; `aria-live` en cambios dinámicos
  - [ ] Sin warnings de axe-core / DevTools en componentes base
  - [ ] Sin "AI look" (gradientes morados, cards gigantes) — regla #1 del `DESIGN.md`
- **Criterio de salida:** catálogo compartido sin hallazgos de a11y; el resto se hereda y se valida puntualmente en `ui-ux-audit`.

| Componente | Estado | Notas |
|---|---|---|
| `components/ui/*` (shadcn primitivos) | ✅ | Radix por debajo (focus-trap, teclado, roles ARIA en dialog/popover/select/tabs/checkbox); `Alert` + `Field` error con `role="alert"`; 7 `sr-only` para nombres accesibles; `Toaster` (sonner) montado en root |
| `components/admin/*` (DataTable, KpiCard, ConfirmDialog, TwoFaDialog, AssetUpload…) | ✅ | DataTable a11y completo (`aria-sort`/`scope`/`aria-label` en checkboxes y orden, loading→Skeleton, empty con icono `aria-hidden`); dialogs sobre Radix con `DialogTitle`/`Description`; 11 `aria-label`; estado por texto+icono (no color-only) |
| `components/rich-content/*` | ✅ | `alt` del autor preservado; sanitizado (rehype-sanitize); mermaid→SVG con title; sin `dangerouslySetInnerHTML` de input de usuario |
| Layout / navegación | ✅ | Skip-link "Saltar al contenido"→`#main-content` (`tabIndex=-1`); nav gateada con `aria` heredado de Radix sidebar; 48 `aria-hidden` en decorativos |

---

## Fase 7 — Tests & cobertura

- **Objetivo:** comportamiento probado (no implementación); flujos críticos con e2e; bugs con test de regresión.
- **Fuente:** `test-driven-development`, `browser-testing-with-devtools` + `references/testing-patterns.md`
- **Persona:** `test-engineer` (estrategia, cobertura, *Prove-It*)
- **Unidad de auditoría:** `tests/unit/*`, `*.test.ts` (vitest) + `tests/e2e/*.spec.ts` (playwright, 26 specs)
- **Checklist:**
  - [ ] Lógica pura de `lib/`/`hooks/` con unit tests (ej. `lib/permissions.test.ts` ya existe) — extender a status maps, utils, guards
  - [ ] Tests prueban **comportamiento**, no detalles de implementación; nombres describen la conducta esperada
  - [ ] e2e cubre flujos críticos (auth, CRUD por dominio, acciones de riesgo); `auth.setup.ts` como project setup
  - [ ] Sin tests `skip`/`only` colados; sin tests que pasan en la 1.ª corrida sin probar nada real
  - [ ] Cada bug fix incluye test de reproducción que falla **antes** del fix
  - [ ] e2e estable: sin flakes silenciados; `error-context.md`/trazas revisadas en fallos
  - [ ] Verificación de browser: sin errores de consola, requests correctos y no duplicados (DevTools)
- **Criterio de salida:** flujos críticos cubiertos; cobertura no decrece; `npm run test` y `npm run e2e` verdes.

| Suite | Estado | Notas |
|---|---|---|
| Unit (vitest) — lib/hooks puros | ⬜ | |
| e2e (playwright) — flujos críticos | ⬜ | |
| Cobertura tracking | ⬜ | |

---

## Fase 8 — Dependencias & supply chain

- **Objetivo:** dependencias justificadas, sin huérfanas, sin vulnerabilidades explotables, versiones alineadas.
- **Fuente:** `deprecation-and-migration` + disciplina de dependencias de `code-review-and-quality`
- **Persona:** `security-auditor` (supply chain) + `code-reviewer`
- **Unidad de auditoría:** `package.json` + `package-lock.json`
- **Checklist:**
  - [ ] `npx knip` sin deps/devDeps sin usar (mantener limpio tras cada feature)
  - [ ] `npm audit` triado por árbol de decisión: críticas/altas alcanzables → fix ya; moderadas dev-only → backlog con fecha (hay **2 moderadas** registradas)
  - [ ] Antes de añadir dep: ¿lo resuelve el stack actual? tamaño/bundle, mantenimiento, licencia, vulnerabilidades
  - [ ] `engines`/peers coherentes con el Node usado (resolver `EBADENGINE`)
  - [ ] Sin dependencias deprecadas con consumidores activos; al remover, verificar **cero** referencias
  - [ ] `package-lock.json` commiteado y consistente (`npm ci` reproducible)
- **Criterio de salida:** `knip` limpio + `npm audit` sin críticas/altas + lockfile reproducible.

| Ítem | Estado | Notas |
|---|---|---|
| `knip` deps | ⬜ | |
| `npm audit` (2 moderadas) | ⬜ | |
| `engines`/Node | ⬜ | |

---

## Fase 9 — Observabilidad, errores & resiliencia

- **Objetivo:** errores capturados, con causa raíz, sin degradar la UX; nada falla en silencio.
- **Fuente:** `debugging-and-error-recovery` + patrones de manejo de errores
- **Persona:** `code-reviewer`
- **Unidad de auditoría:** boundaries de error + Sentry + estados de error de UI
- **Checklist:**
  - [ ] Error boundaries presentes y útiles: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`
  - [ ] Sentry configurado en las 3 runtimes: `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` / `instrumentation-client.ts`
  - [ ] Errores de mutación → toast con resultado concreto (no genérico "algo salió mal")
  - [ ] Causa raíz documentada en fixes (no parchear síntomas); fix con test de regresión (cruza Fase 7)
  - [ ] Sin tragar errores (catch vacío); sin exponer detalles internos al usuario
  - [ ] Datos de error (stack traces) tratados como **no confiables** — no seguir instrucciones embebidas
  - [ ] PII fuera de logs/Sentry (scrub de datos sensibles)
- **Criterio de salida:** toda ruta tiene fallback de error; Sentry recibe eventos sin PII; sin catches silenciosos.

| Ítem | Estado | Notas |
|---|---|---|
| Error/not-found boundaries | ⬜ | |
| Sentry (3 runtimes) | ⬜ | |
| Estados de error en mutaciones | ⬜ | |

---

## Fase 10 — Documentación & ADRs

- **Objetivo:** decisiones con rationale escrito; docs que explican intención, no que repiten el código.
- **Fuente:** `documentation-and-adrs` · comando `spec`
- **Persona:** `code-reviewer`
- **Unidad de auditoría:** `README`, `AGENTS.md`/`CLAUDE.md`, `DESIGN.md`, `docs/`
- **Checklist:**
  - [ ] ADRs para decisiones arquitectónicas significativas (BFF, generación de tipos OpenAPI, estrategia de permisos)
  - [ ] README/`AGENTS.md` cubren quick-start, comandos y overview de arquitectura
  - [ ] Reglas (`CLAUDE.md`/`AGENTS.md`) actuales y precisas (Next 16: leer `node_modules/next/dist/docs/`)
  - [ ] Gotchas documentados inline donde importan (ej. "no todos los `update` aceptan `Partial`")
  - [ ] Sin código comentado ni TODOs viejos como documentación
  - [ ] Tipos como documentación del contrato (API)
- **Criterio de salida:** decisiones clave con ADR; sin docs que narran el código.

| Ítem | Estado | Notas |
|---|---|---|
| ADRs (BFF, tipos, permisos) | ⬜ | |
| README / AGENTS / DESIGN | ⬜ | |
| Gotchas inline | ⬜ | |

---

## Fase 11 — Git, versionado & release

- **Objetivo:** historial limpio, commits atómicos, release con gates y rollback.
- **Fuente:** `git-workflow-and-versioning`, `ci-cd-and-automation`, `shipping-and-launch` · comando `ship`
- **Persona:** `code-reviewer` + `test-engineer`
- **Unidad de auditoría:** historial git + `.github/workflows/ci.yml` + deploy (Vercel)
- **Checklist:**
  - [ ] Commits atómicos (una cosa lógica); mensajes Conventional + gitmoji que explican el *por qué*
  - [ ] Sin cambios de formato mezclados con cambios de comportamiento; refactor separado de feature
  - [ ] `.gitignore` cubre exclusiones estándar (node_modules, `.env`, `.next`, `test-results`, build)
  - [ ] Sin secretos en el diff; sin artefactos de build commiteados
  - [ ] CI corre en cada PR y push a main con todos los gates (lint/types/test/build/audit); fallos bloquean merge
  - [ ] Pipeline < 10 min; deploy con verificación previa y mecanismo de rollback (Vercel)
  - [ ] Ramas de feature no divergen demasiado de `main` (la rama actual `feat/ficha-usuario-completa` tiene un diff grande — considerar partir)
- **Criterio de salida:** CI como gate efectivo en `.github/workflows/ci.yml`; historial limpio; rollback definido.

| Ítem | Estado | Notas |
|---|---|---|
| Commits atómicos / mensajes | ⬜ | |
| `.gitignore` / sin secretos | ⬜ | |
| CI gates (`ci.yml`) | ⬜ | |
| Deploy + rollback (Vercel) | ⬜ | |

---

## Metodología de auditoría y remediación

Cómo se **ejecuta** la auditoría y cómo se **arreglan** los hallazgos. Aquí viven las skills de **proceso** del repo (las que no son un eje técnico) y las personas.

### Personas auditoras (de `agents/`)

| Persona | Rol | Conduce las fases |
|---|---|---|
| `code-reviewer` | Senior Staff Engineer — revisión de 5 ejes | 1, 2, 4, 5, 6, 9, 10, 11 |
| `security-auditor` | Security Engineer — OWASP, threat modeling | 3, 8 |
| `test-engineer` | QA Specialist — estrategia y cobertura, *Prove-It* | 0, 7, 11 |

> Nota: estas personas existen como subagentes (`agent-skills:code-reviewer`, etc.). Se despachan **solo si el usuario lo pide**.

### Proceso de cada fase

1. **`interview-me`** — extraer del founder los criterios y el contexto que el código no revela, antes de auditar.
2. **`context-engineering`** — preparar qué leer por fase (archivos/skills/referencias) sin saturar el contexto.
3. **`using-agent-skills`** — invocar la skill correcta de cada fase antes de emitir juicio.
4. **`doubt-driven-development`** — cuestionar supuestos antes de marcar `✅`; nada de *rubber-stamp* ("LGTM" sin evidencia).
5. **`idea-refine`** — refinar hallazgos ambiguos hasta que sean accionables.

### Remediación de cada hallazgo

6. **`spec-driven-development`** — especificar el arreglo antes de tocar código cuando el cambio es significativo.
7. **`source-driven-development`** — fundamentar en docs oficiales (Next 16 en `node_modules/next/dist/docs/`), no en memoria.
8. **`planning-and-task-breakdown`** — romper la remediación en tareas ordenadas e implementables.
9. **`incremental-implementation`** — aplicar arreglos de a uno, verificando (`npm run ci`) tras cada cambio.

### Comandos de flujo (de `.claude/commands/`)

`spec` → `plan` → `build` → `test` → `review` → `ship`, con `code-simplify` para pasadas de limpieza. Mapean directo al ciclo specificar → planificar → implementar → probar → revisar → publicar.

---

## Matriz de cobertura (incluye **todo**)

Verificación de que el framework contempla **cada** pieza de `addyosmani/agent-skills` + la skill de Vercel.

### Skills (23/23)

| Skill | Fase / Sección |
|---|---|
| `api-and-interface-design` | Fase 2, Fase 4 |
| `browser-testing-with-devtools` | Fase 5, Fase 7 |
| `ci-cd-and-automation` | Fase 0, Fase 11 |
| `code-review-and-quality` | Fase 1 (+ severidad, dependencias) |
| `code-simplification` | Fase 1 |
| `context-engineering` | Metodología · proceso |
| `debugging-and-error-recovery` | Fase 4, Fase 9 |
| `deprecation-and-migration` | Fase 8 |
| `documentation-and-adrs` | Fase 10 |
| `doubt-driven-development` | Metodología · proceso |
| `frontend-ui-engineering` | Fase 6 |
| `git-workflow-and-versioning` | Fase 11 |
| `idea-refine` | Metodología · proceso |
| `incremental-implementation` | Metodología · remediación |
| `interview-me` | Metodología · proceso |
| `performance-optimization` | Fase 5 |
| `planning-and-task-breakdown` | Metodología · remediación |
| `security-and-hardening` | Fase 3 |
| `shipping-and-launch` | Fase 0, Fase 11 |
| `source-driven-development` | Metodología · remediación |
| `spec-driven-development` | Metodología · remediación |
| `test-driven-development` | Fase 7 |
| `using-agent-skills` | Metodología · proceso |

### Agent personas (3/3)

`code-reviewer` · `security-auditor` · `test-engineer` → tabla *Personas auditoras*.

### Reference checklists (5/5)

| Reference | Fase |
|---|---|
| `references/security-checklist.md` | Fase 3 |
| `references/performance-checklist.md` | Fase 5 |
| `references/accessibility-checklist.md` | Fase 6 |
| `references/testing-patterns.md` | Fase 7 |
| `references/orchestration-patterns.md` | Metodología (despacho de personas/subagentes) |

### Comandos (7/7)

`build` · `plan` · `review` · `ship` · `spec` · `test` · `code-simplify` → sección *Comandos de flujo*.

### Externos

| Recurso | Fase |
|---|---|
| `vercel-react-best-practices` (57 reglas, 8 categorías) | Fase 2, Fase 4, Fase 5 |
| [patterns.dev](https://www.patterns.dev/) — JavaScript / React (rendering) / Performance & Loading patterns | Fase 2, Fase 5 |

> Hooks del plugin (`SDD-CACHE`, `SIMPLIFY-IGNORE`) y `docs/*` de setup: infraestructura del plugin, no ejes auditables — listados aquí para que **nada quede sin contemplar**.

---

## Bitácora de cambios

> Se completa al ejecutar cada fase. Formato: `- **[Fase N · Fxx]** descripción del arreglo (verificación).`

### Fase 1 · Calidad de código

- **[F1 · lib/]** Revisión 5-ejes de `lib/` (núcleo + data + status). Núcleo (`guard`/`permissions`/`bff`/`proxy`/`auth`/`signed-asset`/`utils`) y data (`user-detail` con `cache()`, `countries`) **conformes**: cero `any`, comentarios solo "por qué", sin código muerto. (typecheck verde)
- **[F1 · lib/]** Hallazgo F1.3 (sobre-exportación): 12 helpers/metadata de uso interno único des-exportados (`*_STATUS_META`, `LEAGUE_META`, `ROLE_META`, `PLAN_COLOR`, `STATUS_TONE_CLASS`, `gameStatusTone`, `readAccessToken`, `LeagueTier`, `LeagueMeta`, `PlanKey`) → superficie pública mínima, consistente con `DIFFICULTY_META`. Sin cambio de comportamiento.
- **[F1 · hooks/]** Revisión de la capa de datos (49 hooks `use-*`). **Conforme**: TanStack Query consistente (`queryKey` namespaced, invalidación correcta), helpers DRY (`send`/`sendJson`/`fetchItems`/`Paged<T>`), optimistic update con rollback (`useUpdatePipeline`), cero `any`. Archivos grandes (`use-sponsors` 373, `use-coupons` 328) = capa de dominio bien seccionada, no "demasiada responsabilidad".
- **[F1 · hooks/]** Dead code real removido: `LEAGUE_TIER_LABELS`, `STATUS_VARIANT`, `FinanceCurrency` (usados en ningún lado). (typecheck verde)
- **[F1 · tooling]** `knip.json`: `ignoreExportsUsedInFile` + ignore `components/ui/**` (shadcn vendado) + `tests/e2e/auth.setup.ts` y `openapi-typescript` (falsos positivos). Convierte "knip limpio" en señal real: de 147 ítems ruidosos → solo el dead code genuino. Tras resolver F1.1: **knip 100% limpio**.
- **FYI [F1 · hooks/]:** el helper `send()`/`sendJson()` se repite por archivo (locales casi idénticos) — extraíble a un `lib/` compartido, pero toca ~40 archivos → diferido (Optional, no Requerido).
- **[F1 · components/]** Catálogo propio revisado: `DataTable` (a11y completa: `scope`/`aria-sort`/`aria-label`, 2 `eslint-disable` justificados), `CampaignForm` (RHF+zod, `TextField` DRY, `optionalHttpUrl` bloquea `javascript:`), `AssetUpload` (allowlist de tipos + error handling), `app-sidebar` (nav gated por `canWithScope`, data-driven). `components/ui/*` = shadcn vendado (no se audita superficie). **Conforme, cero hallazgos** (knip limpio, cero `any`).
- **[F1 · app/(auth)]** `login` + `change-password` **conformes**: RHF+zod, `PasswordField` show/hide accesible (`aria-pressed`), reglas de fuerza (≥10 + mayús/minús/número), error server vs red diferenciado.
- **[F1 · app/(panel)]** Muestreo del eje "demasiada responsabilidad" sobre los mayores: `coupon-form` (667, el más grande del panel) **bien descompuesto** (wrapper de carga + `*Inner` + `CouponBranchSelector`, 5 `fieldset` seccionados, mapeadores `toValues`/`toInput`). Los archivos grandes son grandes por riqueza de dominio, no por estructura. **Cero hallazgos.**
- **[F1 · alcance]** Dimensiones **objetivas** (dead code / `any` / tipos / lint / build) verificadas al **100%** sobre los 704 archivos. Dimensiones **subjetivas** (legibilidad/simplicidad/arquitectura): deep-review de todas las capas (`lib`, `hooks`, `components`, `app/(auth)`) + los extremos de tamaño + representativos por dominio → patrón uniforme, cero hallazgos. La lectura línea-por-línea de los ~390 archivos restantes de `app/(panel)` no surgiría hallazgos nuevos según la evidencia.
- **⚠️→✅ [F1 gate / F0] HALLAZGO + FIX (robustez de CI):** en el `npm run ci` de cierre, el step `test` salió **0 sin correr tests** (`Failed to start forks worker / Timeout waiting for worker to respond`). Riesgo grave: CI en verde sin ejecutar tests. **Fix:** `vitest pool: 'threads'`. Verificado: tests 9/9 en aislamiento y dentro del `ci`.

### Fase 1 · Barrido línea-por-línea de `app/(panel)` (266 archivos)

> A pedido del founder: lectura **individual** de cada archivo, no muestreo. Se marca cada dominio al completarlo.

- ✅ **Sistema** — dashboard, audit-log, health, jobs, me, leagues (10): conforme. Patrón uniforme (Server Component + `requireAction` + metadata; tablas vía `DataTable`; helpers DRY `numberField`/`bracket`/`fmt*`).
- ✅ **launches** (6) · **features** (3) · **tickets** (4) · **moderation** (6) — 19: conforme. Forms zod (`optionalHttpUrl` bloquea `javascript:`), kanban dnd-kit, triage con color/ícono por acción, UX por riesgo (activar directo / desactivar con confirm).
- **FYI (DRY menor):** mapas de labels repetidos entre hermanos — `REASON_LABELS` (moderation-table + report-detail, idénticos) y `COUNTRY_NAME` (2 archivos de launches ≈ `COUNTRIES.label` de `lib`). Extraíbles al hook/`lib`; Optional, no Requerido.
- ✅ **admins** (7): conforme. Create-admin con contraseña temporal (visible una vez + copiar), edit con **2FA obligatorio** (lo exige el backend en todo PATCH de admin), `SessionsList` self/other con revocar.
- ✅ **bots** (7): conforme salvo F1.4. Tabs (bots/plantillas/pools/métricas), generación masiva, edición inline.
- **🔧 F1.4 (FIX, arquitectura/DRY) — `bots/bots-tabs.tsx`:** `export const COUNTRIES` (string[] de códigos) duplicaba `lib/countries.ts` **desde un componente** y colisionaba en nombre con el canónico. Reapuntado a `@/lib/countries` en `pools-tab` y `generate-bots-button`; duplicado eliminado. knip no lo detectaba (estaba "en uso"). (typecheck verde)
- ✅ **finance** (11): conforme. P&L recharts por moneda/mes/categoría; layout con tabs solo en rutas-tab; form wrapper+inner con sentinel `KEEP` (mantiene comprobante en edición); uploads con allowlist. (FYI: `viewReceipt` podría reusar `lib/signed-asset.ts`.)
- ✅ **messaging** (11): conforme. Nav con tabs gated, acciones inline por estado (aprobar/enviar/cancelar), detalle editable solo si draft+broadcast (resto read-only con Loading/Error accesibles), segmentos con preview de conteo, editor de transaccionales con vars permitidas.
- ✅ **game** (19): conforme + **ejemplar en reuso**. Los 4 modos comparten `GameTable<T>` y `GameDetailShell` (render-prop), helpers `game-bits` (`AccuracyBar`/`durationLabel`/`UserRef`). `schedule-especial-form` con `useFieldArray`, validación de solape/topes, mapeo camelCase→snake.
- ✅ **users** (24): conforme. Ficha completa — Profile tab con `Promise.all` (sin waterfall), `user-actions` con confirmaciones por riesgo + 2FA (borrar-cuenta/cambiar-email), 10 tab-pages Server Component limpias.
- ✅ **content** (64) COMPLETO — conforme, cero hallazgos:
  - hub + **questions** (17): form `useFieldArray` + `MarkdownField`, import CSV con preview + plantilla BOM Excel, `review-selected` con máquina de estados.
  - **news** (12): `markdown-view` SIN `rehype-raw` (XSS-safe) + memoización `AUD-L6`.
  - **careers** (12) + **admission-cutoffs** (6): workflow editor→admin con diff (insert/update/delete/inválidas), plantillas BOM Excel.
  - **ai-prompts** (7): versionado + rollback (admin-only) + playground.
  - **modules-tree** (4): dnd-kit sortable (sensor teclado = accesible), `node-detail` (574) bien descompuesto en 3 forms.
  - **vocational-items** (3) + **riasec-types** (3): edición en modal (U6), RHF+zod.
- ✅ **economy** (93) COMPLETO — conforme, cero hallazgos:
  - ✅ hub + **sponsors** (17): conforme. Mini-CRM (kanban pipeline dnd-kit + 6 tabs). `sponsor-logo-upload` SVG seguro (next/image, no inline); `sponsor-branch-form` con `dynamic(ssr:false)` para Leaflet (lazy-load); docs vía `openSignedAsset`.
  - ✅ **missions** (8) + **coupons** (8): conforme. Cupones con stats/export CSV/soporte (regenerar-reembolsar, role-gated + motivo); misiones con intervención por código de amigo (todo con motivo → audit log).
  - ✅ **banners** (8) + **achievements** (8): conforme. Banner con `PlacementPreview` (maqueta teléfono) + CTR; achievements con `ConditionBuilder` (unión discriminada de 6 tipos) y re-otorgar Kokos con preview + confirm.
  - ✅ **store** (7) + **raffles** (7): conforme. Store con `requiresPlan` + dual asset + ajuste inventario (audit log); raffles con reversibilidad acotada (24h) y reemplazo por mérito.
  - ✅ **videos** (6) + **sponsor-invoices** (4) + **energy** (4): conforme. Video con auto-detección de duración + upload con progreso; facturas con máquina de estados + PDF firmado; energy con patrón `values` de RHF.
  - ✅ **referrals** (3) + **promo-offers** (3): conforme. Hitos de referido con premio polimórfico (kokos/kolones/cosmético, `NormalizedReward`); ofertas Fundador con sentinel `NaN` para %, ventana opcional y grilla `plan×período×pack` reemplazada en bloque.
  - ✅ **subscriptions** (2) + **subscription-prices** (2): conforme. Comp/grant con resolución debounced del código de amigo y módulo acotado al país (derivado en render, sin effect); precios con sentinel `DEFAULT`→`null` para la fila global.
  - ✅ **monetization** (2) + **kokos-packs** (2) + **cross-sell** (2): conforme. Analítica con `hourIso` (trunca a la hora → queryKey estable, evita refetch en bucle); packs con helpers `textField`/`numField` DRY y faro de estado de oferta; cross-sell origen→destino con guardas de auto-referencia.
- **[F1 · app/(panel)] BARRIDO LÍNEA-POR-LÍNEA COMPLETO — 266/266 archivos.** Resultado: **un (1) hallazgo real** (F1.4, COUNTRIES duplicado) en todo el árbol. El resto, uniformemente conforme: cero `any`, cero código muerto, comentarios solo "por qué", Server Component + `requireAction` + `can`/scope como patrón invariante, catálogo `components/admin` y helpers `lib` reutilizados sin copy-paste. **Fase 1 cerrada.**
- **✅ [F1 · lib/] F1.1 (arquitectura) — RESUELTO (mantener):** el subsistema cliente tipado (`lib/api.ts` `serverApi` + dep `openapi-fetch` + `types/api.ts` generado) se **conserva como andamiaje de BFF tipado** (decisión del founder). Hoy el panel pega vía `lib/proxy.ts`/`lib/auth.ts` (fetch crudo); `serverApi` queda disponible para cablear route handlers tipados a futuro. Marcado como intencional en `knip.json` → **knip 100% limpio**.

### Fase 2 · Arquitectura & límites (BFF · RSC)

- **[F2 · route handlers] Patrón proxy verificado en los 220 handlers.** 214/220 usan `forwardToBackend` (proxy fino: reenvía cookie + body + query + status, maneja 204). Los 5 desvíos legítimos están **documentados en su archivo**: `auth/login` (reescribe Set-Cookie con `adaptBackendCookie`), `auth/logout` (limpia cookies), `auth/change-password` (204→`{ok}`), `auth/request-2fa` (allowlist `/v1/admin/` anti open-proxy), `coupons/[id]/export` (respuesta `text/csv`, no-JSON). **Conforme.**
- **🔧 F2.1 (FIX, arquitectura/DRY) — `admins/route.ts` + `audit-log/by-resource/route.ts`:** reinventaban `forwardToBackend` con `fetch` a mano (duplicaban extracción de cookie, parseo JSON y forwardeo de status) y, peor, su bucle `searchParams.set` **colapsaba query params repetidos** (`?country=CR&country=GT` → uno solo). Reescritos a la forma canónica `forwardToBackend(req, m, \`…${qs ? '?'+qs : ''}\`)`, idéntica a sus 214 hermanos (p.ej. el vecino `audit-log/route.ts`). `toString()` preserva params repetidos. (typecheck + lint verdes)
- **[F2 · frontera BFF] Sin fugas cross-origin.** El browser pega **siempre** a `/api/admin/*` relativo (same-origin) — verificado en los 49 hooks: cero URLs absolutas, cero uso de `NEXT_PUBLIC_API_URL` fuera del server (solo `lib/proxy`, `lib/auth`, `lib/api`). Las cookies HTTP-only nunca salen al cliente. **Conforme.**
- **[F2 · acoplamiento] Dirección de dependencias correcta.** `lib/`→`app/` = **cero imports** (sin dependencia invertida). Authz **centralizada en el backend** vía cookie reenviada — NO duplicada en los 220 proxies (single-source-of-truth; evita drift). La UI gatea con `requireAction`/`can` en las páginas (defensa en profundidad), pero la autoridad real es el backend. **Conforme.**
- **FYI [F2 · validación de respuestas]:** los hooks desenvuelven con `unwrapData<T>` + cast desde los tipos OpenAPI (codegen), **sin** validación zod en runtime de las respuestas del backend. Tradeoff aceptado: backend first-party + contrato OpenAPI compartido → zod-validar cada respuesta sería over-engineering. La validación zod **sí** está en los bordes de entrada (forms). Optional, no Requerido. (Se reevalúa en Fase 3 si hay superficie no confiable.)

### Fase 3 · Seguridad & hardening (OWASP)

- **[F3 · authz] Cobertura verificada, sin gaps.** 97/109 pages con `requireAction` directo; las 12 sin guard propio están **gateadas por layout**: las 11 tabs de `users/[id]/*` + su `page.tsx` heredan `requireAction('user:read')` de `users/[id]/layout.tsx`, y `me/sessions` es self-service (solo exige login vía `getCurrentAdmin`). Además `(panel)/layout.tsx` exige autenticación + cambio de contraseña forzado para **todo** el panel. La autoridad real es el backend (`can()` es solo gating de UX, documentado en `permissions.ts`). **Conforme.**
- **[F3 · XSS] Tres superficies de HTML crudo, las tres mitigadas.** `markdown-view` no usa `rehype-raw` (cero HTML crudo); `mermaid.tsx` inicializa con `securityLevel:'strict'` (SVG sin scripts ni click handlers) antes del `innerHTML`; `chart.tsx` (`dangerouslySetInnerHTML`) inyecta **CSS derivado de `chartConfig`** (colores dev-controlados, no input de usuario) y es shadcn vendado. **Conforme.**
- **[F3 · sesión] Tokens nunca en el cliente.** Cero `localStorage`/`sessionStorage` para credenciales (los `sessionStorage` son del workflow de import CSV, no tokens). `admin_at`/`admin_rt` viven en cookies HTTP-only; `adaptBackendCookie` solo reescribe `Path` → preserva `Secure`/`HttpOnly`/`SameSite` del backend. 2FA obligatorio en borrar-usuario / cambiar-email / PATCH-admin. **Conforme.**
- **[F3 · secretos] Superficie limpia.** Cero `.env`/`*.pem`/`*.key`/`*.p12` trackeados; cero secretos hardcodeados; cero `console.*` en `lib/`+`app/api` (sin leak por logs). Sentry **sin `sendDefaultPii`** (no captura cookies/IP), `tracesSampleRate` 0.1 prod. Assets sensibles (docs/facturas) vía firma temporal `openSignedAsset`. **Conforme.**
- **[F3 · errores] Sin fuga de internals.** `error.tsx` muestra `error.message` pero (a) Next redacta errores de Server Components en prod y (b) el panel es interno/autenticado → aceptable para herramienta interna. `global-error.tsx` usa `NextError` genérico. Ambos capturan a Sentry. **Conforme.**
- **🔧 F3.1 (FIX, hardening) — `next.config.ts`:** no había **ningún** header de seguridad. Agregada línea base: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (anti-clickjacking; el panel nunca se embebe), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deniega cámara/micrófono/geo/topics), `Strict-Transport-Security` (HSTS, `includeSubDomains`, sin `preload` para no comprometerse irreversiblemente). Aplicado a `/:path*`. (build verde)
- **⏳ F3.2 (Required, DIFERIDO) — Content-Security-Policy:** sin CSP. Una CSP correcta exige inventariar los orígenes externos reales (API `NEXT_PUBLIC_API_URL`, CDN de assets/imágenes del backend, ingest de Sentry, tiles de Leaflet, fuentes) y manejar nonces para el `<style>` inline de `chart.tsx` + scripts de Next. Aplicarla a ciegas rompe producción → se implementa **con el inventario de infra a la vista** (idealmente report-only primero). Marcado Required, pendiente de entorno de despliegue.

### Fase 4 · Datos, API & estado (TanStack Query)

- **[F4 · infra] `QueryProvider` correcto.** `staleTime: 30s` + `refetchOnWindowFocus: false` + `retry: 1` (intencional para panel admin: evita tormentas de refetch). Client creado con `useState(() => new QueryClient())` → estable entre renders, no se recrea (`rerender-lazy-state-init`). Devtools solo en dev. **Conforme.**
- **[F4 · caché] queryKeys + invalidación verificados en los 49 hooks.** Todos los `queryKey` namespaced (array con prefijo string); detalles con `enabled:!!id` (sin fetch con id vacío); listados con paginación (`page`/`pageSize`); **toda mutación de estado invalida** las queries afectadas (targeted: lista + detalle). Los "off-by-N" del escaneo son la línea `import { useMutation }` + mutaciones-comando legítimas que no tocan caché (`useScheduleEspecial`, `usePlayground`, `useInventoryAdjust`). **Conforme, cero bugs de UI stale.**
- **[F4 · optimistic] Dos optimistic updates, ambos de manual.** `use-features` (drag de etapa kanban) y `use-sponsors` (pipeline) usan el patrón completo: `cancelQueries` → snapshot con `getQueriesData` → `setQueryData` optimista → **rollback en `onError`** desde el contexto → `invalidateQueries` en `onSettled` para reconciliar. **Conforme.**
- **[F4 · errores] Shape único y accionable.** Los helpers `send`/`sendJson`/`sendDelete` extraen `message` del cuerpo de error del backend (`b.message ?? 'Error'`) y lo lanzan como `Error` → la UI consumidora lo muestra en toast/Alert. Las queries lanzan mensaje genérico → la UI rinde estado `isError`. **Conforme.**
- **FYI [F4 · contratos] (= raíz del tradeoff F1.1, Optional):** los tipos de los hooks (`CouponDetail`, `StoreItem`, …) están **hand-rolled**, no derivados de `types/api.ts` (OpenAPI). Riesgo de drift: un cambio de DTO en el backend no da error de compilación (sí `undefined` en runtime). Aceptado porque el panel pega vía fetch crudo (no el `serverApi` tipado); `types/api.ts` y el andamiaje `serverApi` quedan disponibles para cablear handlers tipados cuando se priorice. Mismo origen que el FYI de zod (Fase 2).
- **FYI [F4 · DRY] (= FYI de Fase 1, Optional-diferido):** el helper `send*` se repite en ~33 hooks con variaciones menores (métodos soportados, `credentials:'include'` redundante en same-origin pero inofensivo). Consolidable a un `lib/` compartido, pero toca ~33 archivos → refactor propio y separado, no dentro de la auditoría (Rule of 500). Sin impacto funcional.

### Fase 5 · Performance & Core Web Vitals

- **[F5 · medición primero] Tamaños reales medidos de los artefactos** (`.next/static/chunks`, porque el build con Turbopack no imprime la tabla de tamaños por ruta): recharts = chunk de **308 KB**, leaflet = **571 KB**, mermaid en chunk propio. Base objetiva para decidir, no a ciegas.
- **[F5 · lazy] leaflet y mermaid ya correctamente diferidos.** `sponsor-branch-form` carga el mapa con `dynamic(ssr:false)` + `import('leaflet')`; `mermaid.tsx` con `import('mermaid')` perezoso. Ambos (los 2 más pesados) **fuera del bundle inicial**. katex/rehype-katex solo en `rich-content` (rutas de contenido) → aislado por route-splitting. **Conforme.**
- **🔧 F5.1 (FIX, bundle) — dashboard:** recharts (308 KB) entraba **estático** en `dashboard-overview` (la landing post-login), aunque los 3 charts están below-the-fold (debajo de los KPIs). Extraídos a `dashboard-charts.tsx`, cargado con `next/dynamic({ ssr: false })` + fallback de igual alto (sin CLS). **Verificado:** el código de charts quedó en un chunk async de 42 KB que arrastra recharts por la frontera dinámica → fuera del bundle inicial del dashboard. Las 7 queries siguen en el parent (data-fetching idéntico, en paralelo, sin waterfall); solo se difiere el render. (ci + knip verdes). *Nota:* monetization y finance/pnl mantienen recharts estático a propósito (rutas de navegación intencional, charts = contenido principal).
- **[F5 · render/datos] Sin anti-patrones.** Tablas paginadas server-side (`pageSize`) → no requieren virtualización; `DataTable` y los managers memoizan `columns` con `useMemo`; dashboard dispara sus 7 queries en paralelo (sin waterfall); `React.cache()` en `user-detail` dedupea el fetch entre layout y tabs; único `<img>` crudo justificado (preview de URL externa con `loading=lazy`). lucide-react/@radix se tree-shakean por los defaults de `optimizePackageImports` de Next 16. **Conforme.**
- **FYI [F5 · medición de campo]:** los Core Web Vitals reales (LCP/INP/CLS de campo) requieren un entorno desplegado + Lighthouse/RUM. El análisis acá es estático + tamaños de bundle (lo accionable sin deploy). La validación de campo se hace en staging (cruza con F3.2/infra).

### Fase 6 · Accesibilidad técnica & componentes compartidos

- **[F6 · primitivos] Base Radix sólida.** Los `components/ui/*` (shadcn vendado) heredan de Radix: focus-trap + retorno de foco en dialogs, navegación por teclado y roles ARIA correctos en dialog/popover/select/tabs/checkbox. `Alert` y `Field` (error de validación) llevan `role="alert"` → los errores de RHF+zod se **anuncian** sin `aria-live` manual. `Toaster` (sonner, live-region built-in) montado en `app/layout.tsx`. **Conforme.**
- **[F6 · catálogo] `components/admin/*` con a11y deliberada.** `DataTable`: `aria-sort` + `scope` en headers, `aria-label` en orden y en checkboxes select-all/row, loading→Skeleton, empty con icono `aria-hidden`. `ConfirmDialog`/`TwoFaDialog` sobre Radix `Dialog` con `DialogTitle`+`DialogDescription`. 11 `aria-label` en icon-buttons. Estado comunicado por **texto+icono** (StatusBadge, KpiCard con `%` firmado), nunca solo color. **Conforme.**
- **[F6 · análisis] `aria-live: 0` NO es un gap.** Los cambios dinámicos se anuncian por live-regions **implícitas** (`role="alert"` en errores/alerts + la live-region de sonner para toasts) — el patrón idiomático, superior a divs `aria-live` manuales. Verificado que no hay `onClick` en `div`/`span` no-interactivos (toda interacción en `button`/`a`/Radix → teclado garantizado). Skip-link "Saltar al contenido" en el layout. **Conforme.**
- **[F6 · resultado] Cero hallazgos.** El catálogo compartido (que heredan las 94 rutas) está bien construido en a11y: Radix da el cimiento, el catálogo añade nombres accesibles, roles de alerta, skip-link y 48 `aria-hidden` en decorativos. Sin fixes. (La validación de campo con axe-core/lector de pantalla real se hace en `ui-ux-audit`/staging.)
- **FYI [F6 · decorativos, Optional]:** algunos íconos lucide decorativos (chip de KpiCard, flecha de tendencia) no llevan `aria-hidden`. No es violación axe (los `<svg>` sin role/title se ignoran), y el `%` firmado + label ya transmiten el dato → cosmético, sin impacto. Aplicar `aria-hidden` a todos sería churn sin ganancia.

## Checkpoint final

La auditoría técnica se declara **cerrada** cuando:

- [ ] Las 12 fases (0–11) en `✅ conforme`
- [ ] `npm run ci` verde + `npm run e2e` verde
- [ ] `npx knip` limpio + `npm audit` sin críticas/altas
- [ ] Cada hallazgo *Crítico*/*Requerido* resuelto; los diferidos con justificación y fecha de revisión
- [ ] Bitácora completa con la historia de verificación
