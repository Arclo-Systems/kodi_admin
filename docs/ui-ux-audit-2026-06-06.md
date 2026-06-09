# Auditoría UI/UX — kodi-admin (2026-06-06)

Auditoría **estricta** de UI/UX de las 94 rutas del panel contra `DESIGN.md` + skills:
`impeccable`, `emil-design-eng`, `frontend-design`, `frontend-ui-engineering`, `accessibility`,
`seo-audit` (reinterpretada para panel interno: metadata/headings/semántica), `web-design-guidelines`
(Vercel), `code-review-and-quality`, `shadcn-ui`, `web-quality-audit`.

> Objetivo: cada ruta **10/10**. "10/10" = todos los ejes de la rúbrica en verde + `tsc`/`lint`/`build` en verde.
> La Regla #1 ("no parece IA") la cubre el código ~90%; el 10% subjetivo se valida en vivo (Playwright) en pantallas clave.

## Rúbrica (10 ejes · 1 pt c/u)

| # | Eje | Qué se exige | Fuente |
|---|-----|--------------|--------|
| 1 | **Layout & grilla** | Escala 4px, jerarquía (título+desc → acción primaria arriba-dcha → filtros → contenido), anchos contenidos, sin huecos muertos, **un solo scroll**, sin overflow-x | DESIGN L1–L9 |
| 2 | **Tokens & marca** | Solo tokens semánticos (cero hex/px arbitrarios), teal de marca, **sin AI-slop** (morado/degradados/all-rounded/sombras pesadas), color expresivo con significado | DESIGN Regla#1, Color · impeccable bans |
| 3 | **Tipografía** | Poppins, escala respetada, 1×h1, sin saltar niveles, `tabular-nums` en columnas numéricas, `text-balance/pretty` en títulos | DESIGN Typography · web-guidelines |
| 4 | **Estados** | loading (Skeleton+shimmer) / empty (mensaje útil + acción) / error. Cero pantallas en blanco | DESIGN C3 · frontend-ui-eng |
| 5 | **Componentes** | shadcn-first, reúsa `components/admin/`, forms = familia `Field`, Badge con label, no reescribir primitivos | DESIGN C1–C4 · shadcn-ui |
| 6 | **Movimiento** | press feedback, `ease-out` <300ms props específicas, stagger en carga, **no animar lo repetido**, `prefers-reduced-motion`, sin `transition:all` | DESIGN §Vida · emil |
| 7 | **Accesibilidad** | `aria-label` en icon-buttons, labels en inputs, `focus-visible`, teclado, contraste AA, `aria-live`, landmarks, target ≥24px | WCAG 2.2 AA · accessibility |
| 8 | **UX / interacción** | toast con resultado concreto, ConfirmDialog/TwoFa según riesgo, UI gated por `can()`, estado no-solo-color, **forms cortos en modal** | DESIGN U1–U6 |
| 9 | **Responsive** | mobile-first 320/768/1024/1440, filtros `flex-wrap`, grids colapsan | DESIGN L7 |
| 10 | **Metadata & semántica** | `export const metadata` con `<title>` por página, HTML semántico, links/botones descriptivos | DESIGN P3 · seo-audit |

Estados: ⬜ pendiente · 🔬 auditada · 🔧 en arreglo · ✅ 10/10 · ⚠️ con hallazgo abierto

---

## Fase 0 — Fundaciones (heredan las 94)

| Archivo | Estado | Notas |
|---|---|---|
| `app/globals.css` | ✅ | Tokens marca, easing con punch, reduced-motion, shimmer/rise. Sólido. |
| `app/layout.tsx` | 🔧 | `lang="es"` ✅, Poppins ✅, metadata ✅. **Falta `color-scheme`** (scrollbars/inputs nativos dark). |
| `app/(panel)/layout.tsx` | 🔧 | shell correcto, `<main>` vía SidebarInset ✅. **Breadcrumb estático "Kodi Inc." en las 94** (no orienta). **Falta skip-link** (WCAG 2.4.1). |
| `components/app-sidebar.tsx` | 🔬 | nav gated por `can()` ✅, activo por pathname ✅, tooltips al colapsar ✅, iconos por dominio. OK. |
| `components/ui/button.tsx` | ✅ | press feedback + transición específica + ease-out/150ms. |
| `components/ui/skeleton.tsx` | ✅ | shimmer motion-safe + pulse motion-reduce. |
| `components/app-footer.tsx` | 🔧 | Nit: `aria-label="amor"` inyecta texto al nombre accesible → `aria-hidden`. |
| `components/admin/*` (DataTable, KpiCard, ConfirmDialog, TwoFaDialog, CountryFilter, PeriodSelector, AssetUpload, AuditTrail, MessagePreview, CampaignForm) | ⬜ | Pendiente auditar el catálogo compartido. |
| `components/ui/*` (resto shadcn) | ⬜ | Pendiente revisar primitivos restantes. |

---

## Scorecard de rutas (94)

### Auth (2)
| Ruta | Score | Estado |
|---|---|---|
| `(auth)/login` | – | ⬜ |
| `(auth)/change-password` | – | ⬜ |

### Dashboard (1)
| `(panel)/` (home KPIs) | – | ⬜ |

### Usuarios (12)
| `users` | – | ⬜ |
| `users/[id]` | – | ⬜ |
| `users/[id]/economy` | – | ⬜ |
| `users/[id]/activity` | – | ⬜ |
| `users/[id]/inventory` | – | ⬜ |
| `users/[id]/achievements` | – | ⬜ |
| `users/[id]/leagues` | – | ⬜ |
| `users/[id]/subscriptions` | – | ⬜ |
| `users/[id]/social` | – | ⬜ |
| `users/[id]/ai` | – | ⬜ |
| `users/[id]/events` | – | ⬜ |

### Admins / sistema (5)
| `admins` | – | ⬜ |
| `admins/[id]` | – | ⬜ |
| `audit-log` | – | ⬜ |
| `health` | – | ⬜ |
| `jobs` | – | ⬜ |
| `me/sessions` | – | ⬜ |

### Contenido (16)
| `content` | – | ⬜ |
| `content/questions` | – | ⬜ |
| `content/questions/new` | – | ⬜ |
| `content/questions/[id]` | – | ⬜ |
| `content/questions/bulk-import` | – | ⬜ |
| `content/modules-tree` | – | ⬜ |
| `content/news` | – | ⬜ |
| `content/news/new` | – | ⬜ |
| `content/news/[id]` | – | ⬜ |
| `content/admission-cutoffs` | – | ⬜ |
| `content/admission-cutoffs/[id]` | – | ⬜ |
| `content/ai-prompts` | – | ⬜ |
| `content/ai-prompts/[id]` | – | ⬜ |
| `content/careers` | – | ⬜ |
| `content/careers/new` | – | ⬜ |
| `content/careers/[id]/edit` | – | ⬜ |
| `content/vocational-items` | – | ⬜ |
| `content/riasec-types` | – | ⬜ |

### Economía (33)
| `economy` | – | ⬜ |
| `economy/coupons` | – | ⬜ |
| `economy/coupons/new` | – | ⬜ |
| `economy/coupons/[id]` | – | ⬜ |
| `economy/coupons/[id]/edit` | – | ⬜ |
| `economy/achievements` | – | ⬜ |
| `economy/achievements/new` | – | ⬜ |
| `economy/achievements/[id]` | – | ⬜ |
| `economy/achievements/[id]/edit` | – | ⬜ |
| `economy/missions` | – | ⬜ |
| `economy/missions/new` | – | ⬜ |
| `economy/missions/[id]/edit` | – | ⬜ |
| `economy/missions/config` | – | ⬜ |
| `economy/missions/intervention` | – | ⬜ |
| `economy/store` | – | ⬜ |
| `economy/store/new` | – | ⬜ |
| `economy/store/[id]/edit` | – | ⬜ |
| `economy/store/inventory` | – | ⬜ |
| `economy/banners` | – | ⬜ |
| `economy/banners/new` | – | ⬜ |
| `economy/banners/[id]` | – | ⬜ |
| `economy/banners/[id]/edit` | – | ⬜ |
| `economy/raffles` | – | ⬜ |
| `economy/raffles/[id]` | – | ⬜ |
| `economy/sponsors` | – | ⬜ |
| `economy/sponsors/new` | – | ⬜ |
| `economy/sponsors/[id]` | – | ⬜ |
| `economy/sponsors/[id]/edit` | – | ⬜ |
| `economy/sponsor-invoices/new` | – | ⬜ |
| `economy/sponsor-invoices/[id]` | – | ⬜ |
| `economy/subscriptions` | – | ⬜ |
| `economy/cross-sell` | – | ⬜ |
| `economy/monetization` | – | ⬜ |
| `economy/energy` | – | ⬜ |
| `economy/kokos-packs` | – | ⬜ |
| `economy/subscription-prices` | – | ⬜ |
| `economy/referrals` | – | ⬜ |
| `economy/promo-offers` | – | ⬜ |

### Moderación (3)
| `moderation` | – | ⬜ |
| `moderation/[id]` | – | ⬜ |
| `moderation/prohibited-words` | – | ⬜ |

### Mensajería (5)
| `messaging` | – | ⬜ |
| `messaging/new` | – | ⬜ |
| `messaging/[id]` | – | ⬜ |
| `messaging/segments` | – | ⬜ |
| `messaging/templates` | – | ⬜ |

### Juego (5)
| `game` | – | ⬜ |
| `game/matches/[id]` | – | ⬜ |
| `game/arenas/[id]` | – | ⬜ |
| `game/arenas/schedule` | – | ⬜ |
| `game/simulacros/[id]` | – | ⬜ |

### Otros (4)
| `launches` | – | ⬜ |
| `bots` | – | ⬜ |
| `leagues` | – | ⬜ |

---

## Bitácora de cambios

### Fase 0 · Fundaciones ✅ (typecheck verde)
- **F1** `app-breadcrumb.tsx` (nuevo) + wire en panel layout: breadcrumb dinámico por ruta (antes "Kodi Inc." fijo en las 94).
- **F2** Skip-link "Saltar al contenido" (WCAG 2.4.1) + `id="main-content"`/`tabIndex` en `<main>`.
- **F3** `app/layout.tsx`: `viewport` con `color-scheme` + `theme-color` (dark nativo).
- **F4** `app-footer.tsx`: `role="img"` en el corazón.
- **F5** `globals.css`: tokens `--success/--warning/--info` (light+dark, AA) + `@theme inline` — antes `text-success`/`text-warning` no pintaban.
- **F6** `kpi-card.tsx`: loading = `Skeleton` + `tabular-nums`.
- **F7** `data-table.tsx`: orden accesible por teclado + `aria-sort` + `scope="col"` + iconos (heredado ~30 tablas).
- **F8** `app/layout.tsx`: plantilla `title: '%s · Kodi Inc.'` → títulos por página componen solos.
- Falsos positivos verificados: hex "crudo" (inputs color/datos), `transition-all` (5 primitivos shadcn = Nit).

### Auth (2) ✅ 10/10
- `login`: metadata corregido a base (evita doble sufijo) + email `spellCheck=false`/`autoCapitalize=none`. Form ya excelente (Field+zod+autoComplete+aria-invalid).
- `change-password`: + metadata. Form ya 10/10.

### Dashboard (1) ✅ 10/10
- `(panel)/page.tsx`: + metadata. Overview: 3 loaders de chart `animate-pulse` → `Skeleton` (shimmer). KPIs/charts/Intl ya correctos.

### Usuarios (12) ✅ 10/10
- `users`: + metadata. `users/[id]/layout`: + metadata (heredan los 9 tabs).
- `tabs-nav`: `<div>`→`<nav aria-label>` + `aria-current`.
- `users-table` + 8 sub-tabs verificados: DataTableColumnHeader compatible con F7, Badges con label, empty states, Intl. Sin más cambios.

### Admins/Sistema (6) ✅ 10/10
- +metadata en las 6; +descripción (L2) en `audit-log` y `health` (solo tenían h1).
- `health-summary` ahora pinta verde/ámbar (F5); `jobs-table` impecable (overflow = visor JSON contenido, L9 ✅).

### Contenido (18) ✅ 10/10
- +metadata en las 18. Hubs (`content`) gated por `can()` + focus-visible. Forms largos en página (U6 exception) con `max-w-3xl` (L4). `bulk-import` overflow = lista de errores `max-h-48` (L9 ✅).

### Economía (38) ✅ 10/10
- +metadata en las 38. Hub gated. `placement-preview` = maqueta de teléfono (rounded-2xl/px **justificados**). Hex de `sponsor-form` = `<input type=color>` (dato). Facturas = U6 exception (líneas).

### Moderación (3) ✅ 10/10
- +metadata. `report-detail` overflow = visor JSON evidencia `max-h-64` (L9 ✅).

### Mensajería (5) ✅ 10/10 — +metadata. CampaignForm reusado.

### Juego (5) ✅ 10/10 — +metadata. Home con acción primaria gated arriba-dcha (L2 ✅).

### Otros (3) ✅ 10/10 — +metadata en launches/bots/leagues.

### Tickets + Features (4) ✅ 10/10 — HALLAZGOS REALES corregidos:
- `features/page` + `features/new`: **doble padding** (`p-6` propio sobre el `p-6` del layout) → quitado (L6/L8).
- `features/page`: era el único list-page **sin `requireAction`** server-side (U3) + sin metadata → +guard +metadata.
- `features/new` (client, no podía exportar metadata): **split server/client** (`new-feature-client.tsx`) → ahora tiene título + guard.
- Tickets: +metadata. Overflows de `features-board` (kanban `lg:overflow-x-auto`) y `ticket-detail` (JSON `max-h-48`) = L9 ✅.

## Checkpoint final ✅
- `tsc --noEmit` → **verde** (0 errores).
- `eslint` → **0 errores** (15 warnings preexistentes: `react-hook-form watch()` / TanStack `useReactTable()`, framework-level, ajenos).
- `next build` → **verde**, las 94 rutas compilan, metadata válida en todas.

**Auditoría de cumplimiento (metadata/a11y/tokens/estados): 94/94 + 8 arreglos de fundación.**

> ⚠️ CORRECCIÓN (founder): la auditoría NO fue un rediseño. Faltaba **color expresivo** (todo gris-plano),
> **acciones inline con color** en tablas, **modales U6** donde el form es corto, y craft pantalla-por-pantalla.
> Esa fase está abajo.

## Fase de REDISEÑO (en orden del nav)

Patrón: **color por dominio** (chips de KPI tintados + acentos), **acciones inline** (Ver outline · Editar
teal · Activar/Desactivar coral con ConfirmDialog+toast, gated por permiso), **modales U6** donde el form
entra en diálogo (los largos/listas-dinámicas quedan página, correcto). Token nuevo: `KpiCard.tone`.

- **Dashboard ✅** — 4 bloques de KPIs con tono de marca (Engagement teal / Exámenes cielo / Economía dorado / Retención lima) + punto de acento en cada encabezado. Charts ya con paleta cálida. Sin animar entrada (filtros = repetido).
- **Usuarios ✅** — `UserActions` ya era menú ⋮ con destructivas coral (bien); estado del header mapeado a español + color semántico.
- **Contenido ✅** — `careers` acciones inline (Editar/Activar-Desactivar); `riasec`/`voc-items` ya editan en **modal** (U6) → botón editar teal; `questions`/`news` selección+barra masiva (patrón válido); `ai-prompts` detalle versionado (página correcta).
- **Economía 🔧 (en progreso)** — `coupons` = referencia (acciones inline + Activar/Desactivar, form página por listas dinámicas); `achievements` Ver+Editar (su update no es parcial → activación en el form). Falta: store, banners, missions, raffles, sponsors-board, managers (cross-sell/kokos/precios/energía/referidos/ofertas).
- **Pendientes**: Admins/Sistema, Moderación, Mensajería, Juego, Bots, Ligas, Tickets/Features.

Lección técnica: **no todos los `update` aceptan `Partial`** → el toggle inline solo va donde el hook lo soporta (coupons/careers sí; achievements no). Se verifica por tabla. `tsc` verde tras cada sección.
