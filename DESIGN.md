---
# DESIGN.md — Kodi Inc.
# Identidad visual: MARCA KODI. Fuente de verdad de marca (colores + tipografía):
#   ../frontend/src/theme/colors.ts  y  ../frontend/src/theme/typography.ts  (+ docs/design-system.md).
# Implementación del panel: shadcn/ui (preset radix-nova) + Tailwind v4; tokens en app/globals.css.
# ✅ Marca aplicada: globals.css mapea los tokens a la marca (primary=teal #408D99, etc.) y la fuente
#    del panel es Poppins (vía next/font). Ver §Estado y alineación para el detalle.

meta:
  framework: "Next.js 16 (App Router) + React 19"
  styling: "Tailwind CSS v4 + shadcn/ui (radix-nova)"
  brandSource: "../frontend/src/theme/{colors,typography}.ts"
  darkMode: "class (.dark); toggle en runtime vía next-themes (menú de usuario). Superficie base oscura = #141F25"

colors:
  brand: # constantes en light y dark (hex). primary = identidad Kodi
    primary: "#408D99"     # Teal Kodi — CTAs, tabs/links activos, progreso
    cafe: "#422622"        # café oscuro — contornos mascota, acentos oscuros
    coral: "#F47C6B"       # error / respuesta incorrecta / alerta crítica
    coralDark: "#B34734"   # coral legible como TEXTO sobre superficie clara (AA)
    lima: "#9BCB6C"        # éxito / respuesta correcta
    limaDark: "#4F7A2E"    # lima legible como TEXTO sobre superficie clara (AA)
    dorado: "#E3B23C"      # rachas, logros, XP, premium
    cielo: "#5DB7E8"       # info, hints, Tutor IA
    durazno: "#F6B38E"     # CTA secundario suave / onboarding
    warning: "#F4A261"     # alertas no críticas (renovación, advertencia suave)
    blanco: "#FEFEFE"      # texto sobre fondos oscuros de marca
  light:
    surfaceBase: "#FAFAFA"
    surfaceCard: "#FFFFFF"
    surfaceInput: "#F5F5F5"
    textPrimary: "#171717"
    textSecondary: "#525252"
    textTertiary: "#A3A3A3"
    textInverse: "#FFFFFF"
    textBrand: "#408D99"
    borderSubtle: "#E5E5E5"
    borderDefault: "#D4D4D4"
    borderStrong: "#408D99"
  dark: # surface.base es teal-tinted (#141F25), no negro puro — coherente con el primary
    surfaceBase: "#141F25"
    surfaceCard: "#1B2932"
    surfaceElevated: "#243640"
    surfaceInput: "#1B2932"
    textPrimary: "#FAFAFA"
    textSecondary: "#A8B5BD"
    textTertiary: "#5D6E78"
    textInverse: "#141F25"
    textBrand: "#5DB0BE"   # variante clara del teal, legible sobre fondo oscuro
    borderSubtle: "#1F2D36"
    borderDefault: "#324551"
    borderStrong: "#5DB0BE"

typography:
  family:
    fontFamily: "Poppins"   # ÚNICA fuente del panel: body + headers + todo
    weights: [400, 500, 600, 700]
  note: "El admin usa SOLO Poppins. Outfit (wordmark) y Dongle (display/scores) son de la app móvil y NO se usan en el panel."
  scale: # fontSize/lineHeight en px (design-system §2)
    h1: { fontSize: 24, lineHeight: 32, weight: 700 }
    h2: { fontSize: 22, lineHeight: 30, weight: 600 }
    h3: { fontSize: 18, lineHeight: 26, weight: 600 }
    body: { fontSize: 15, lineHeight: 22, weight: 400 }
    caption: { fontSize: 13, lineHeight: 18, weight: 400 }
    small: { fontSize: 11, lineHeight: 16, weight: 400 }
    button: { fontSize: 15, lineHeight: 20, weight: 600 }

rounded:
  base: "0.625rem" # --radius (panel, radix-nova)
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  "2xl": "1.125rem"

spacing:
  base: "0.25rem" # escala de 4px (idéntica en frontend y panel); usar solo múltiplos

components: # implementación shadcn del panel, mapeada a tokens semánticos
  button:
    backgroundColor: "primary"   # → debería resolver a brand.primary (teal)
    textColor: "primary-foreground"
    rounded: "md"
    height: "2.25rem"  # h-9 (sm=h-8, lg=h-10, icon=size-9)
    variants: "default | secondary | outline | ghost | destructive | link"
  card:
    backgroundColor: "card"
    rounded: "xl"
    border: "border"
  input:
    border: "input"
    rounded: "md"
    height: "2.25rem"
    ringColor: "ring"   # focus → brand.primary
  badge:
    rounded: "md"
    variants: "default(primary) | secondary | outline | destructive"
---

# DESIGN.md — Kodi Inc.

## Overview

Sistema visual del **panel administrativo de Kodi** (`kodi-admin`, web). La **identidad (colores + tipografía) es la MARCA KODI**, cuya fuente de verdad vive en la app móvil: `../frontend/src/theme/colors.ts`, `../frontend/src/theme/typography.ts` y `../docs/design-system.md`. La **implementación** del panel es **shadcn/ui (preset radix-nova) sobre Tailwind v4**, con tokens en `app/globals.css`.

> ✅ **Estado de implementación:** la marca está aplicada — `app/globals.css` mapea los tokens a la marca (primary=teal, destructive=coral, superficies/borde light+dark) y la fuente del panel es **Poppins** (`next/font`). Ver §Estado y alineación.

Reglas de oro:

### REGLA #1 (la más importante) — NO se debe ver "hecho por IA"

El panel tiene que verse **diseñado por un equipo de producto real con criterio**, no generado por una IA. Esta regla está **por encima de todas las demás**: si una decisión visual cumple las otras reglas pero "huele a IA", está mal. Es operativa, no un deseo:

- **NUNCA** (el "look IA"): degradados morados/índigo (la marca es **teal**, no morado); "todo redondeado" (`rounded-2xl` por defecto en todo); sombras pesadas o apiladas; *hero sections* genéricos; grids de cards uniformes sin jerarquía; padding grande e **igual** en todo; glassmorphism porque sí; emojis decorativos; texto de relleno tipo *lorem ipsum*; ilustraciones/blobs gratuitos.
- **SIEMPRE**: la **marca real de Kodi** (teal `#408D99`, paleta de apoyo con significado); **jerarquía visual con propósito** (lo importante pesa más); layouts que siguen la **prioridad de la información**, no una plantilla; **densidad de admin** (es una herramienta de trabajo, no una landing — espaciar para escanear datos, no para "respirar"); contenido y datos **reales** al diseñar.
- Prueba rápida: *¿un ingeniero senior diría "esto parece sacado de un generador"?* Si sí, rehacerlo.

### Las demás reglas de oro
- **100% componentes shadcn** (descargar/usar; customizar después) — no escribir UI a mano que duplique un primitivo.
- **Solo tokens semánticos** en el markup (`bg-primary`, `text-muted-foreground`, `border-input`); nunca hex crudo. Los hex de marca viven en los tokens, no en los componentes.
- **Dark mode por tokens** (clase `.dark`), con **toggle en runtime** (next-themes; en el menú de usuario del sidebar). Superficie base oscura = **`#141F25`** (teal-tinted, no negro puro).

## Colors

**Primary = Teal Kodi `#408D99`** (CTAs, activos, links, focus). Es el color de identidad.

**Secundarios / acentos semánticos** (la "paleta de apoyo", no decorativos — cada uno tiene significado):
- `coral #F47C6B` → error / destructive (texto: `coralDark #B34734`).
- `lima #9BCB6C` → éxito (texto: `limaDark #4F7A2E`).
- `dorado #E3B23C` → rachas / logros / XP / premium.
- `cielo #5DB7E8` → info / hints / Tutor IA.
- `durazno #F6B38E` → CTA secundario suave. `warning #F4A261` → alerta no crítica.

**Superficies / texto / bordes** por modo (light + dark) — ver front matter. Dark es **teal-tinted** (`#141F25`), no negro puro, para coherencia con el teal.

Los pares texto/superficie cumplen **WCAG AA (≥4.5:1)** (los `*Dark` existen justamente para usar coral/lima como texto sobre fondos claros). **Excepción conocida:** el texto blanco sobre el teal del botón primary (`#408D99`) queda en ~3.8:1 — aceptable como elemento de UI prominente (umbral ≥3:1), pero por debajo de AA para texto pequeño; no usar texto blanco chico sobre teal. No transmitir estado solo por color: acompañar con ícono/texto.

## Typography

- **Poppins** = **única fuente del panel** (body, headers, todo) — pesos 400/500/600/700.
- Outfit (wordmark) y Dongle (display/scores) son de la app **móvil** y **NO** se usan en el admin.
- Escala (px): h1 24/32 · h2 22/30 · h3 18/26 · body 15/22 · caption 13/18 · small 11/16 · button 15/20. No saltar niveles.

## Layout — PRIORIDAD MÁXIMA (a la par de la Regla #1)

El layout es lo que más cuida este panel: **todo tiene que calzar, verse limpio y organizado, aprovechar el espacio sin saturar**. Se revisa **pantalla por pantalla** (es específico de cada una, no se hereda de los componentes).

- **L1 · Grilla y ritmo.** Todo alineado a la **escala de 4px / `0.25rem`** (`gap-2/3/4/6`, `p-3/6`, `space-y-6`); cero valores arbitrarios; nada "flotando" sin alineación.
- **L2 · Jerarquía y orden de lectura.** Cada página: **título + descripción** arriba → **acción primaria** (arriba-derecha) → **filtros** → **contenido**. Lo importante, primero.
- **L3 · Densidad justa.** Aprovechar el ancho para mostrar datos (es un admin), pero con respiro: ni cards enormes con poco adentro, ni todo apretado. Tablas densas pero legibles.
- **L4 · Anchos contenidos.** Forms y texto con `max-width` legible (no estirados a todo el monitor); tablas full-width; contenido centrado en el shell.
- **L5 · Agrupación.** Lo relacionado va junto (en su `Card`/sección con título); separación clara entre grupos (`space-y-6`).
- **L6 · Consistencia entre pantallas.** Misma posición de acciones/filtros/paginación, mismo padding de página, mismo **shell** (`SidebarProvider` + `AppSidebar` + `SidebarInset` con header trigger + breadcrumb) — en las 94.
- **L7 · Responsive real.** Mobile-first; probar **320 / 768 / 1024 / 1440**. Filtros `flex flex-wrap gap-2`; grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4` que colapsan bien.
- **L8 · Sin huérfanos ni huecos muertos.** Nada de espacios vacíos grandes ni elementos sueltos sin alineación.
- **L9 · Scrolls controlados.** Un solo scroll natural (el de la página dentro del shell). **Nada de** scrollbars internos accidentales (`overflow-auto`/altura fija innecesaria), doble scroll, ni **scroll horizontal** (algo más ancho que el viewport). Una tabla ancha que sí necesita scroll horizontal va **contenida en su card**, bien indicada — nunca desbordando la página.

## Vida y movimiento — el panel NO es plano

Norte: **Linear / Vercel con más color** (expresivo y con marca), nunca un festival de efectos.

- **Color expresivo y con marca.** Presencia real de la paleta de Kodi (no gris-sobre-blanco): KPIs/métricas con acento, badges de estado con su color, **iconos por dominio coloreados**, encabezados/acentos con un toque de teal, gráficos con la paleta cálida.
- **Secundarios también decorativos**, con 2 guardas: (1) **no fabricar falsos estados** → para decoración usar **dorado / cielo / durazno / teal**, evitar **coral** (lee como error) y **lima** (lee como éxito) en zonas neutrales; (2) **tints suaves** para fondos (`bg-{color}/8–12`), no el color pleno como fondo grande.
- **Movimiento (emil-design-eng), nivel expresivo.** Craft a fondo: feedback al **press** en pressables, entradas con **easing fuerte** (`ease-out`, **<300ms**, propiedades específicas — nunca `transition: all`), **hover** suave, **skeletons con shimmer**, **stagger + fade-up** (30–80ms) al cargar listas/cards/KPIs. Popovers origin-aware; modales centrados.
- **`prefers-reduced-motion`** siempre respetado (menos movimiento, no cero).
- **Guarda dura (Regla #1).** Prohibido: degradados morados/índigo, glassmorphism, efectos en cada elemento, y **animar lo repetido** (filtros, paginación, navegación, teclado — emil: las acciones de cientos de veces/día NO se animan).

## Elevation & Depth

Diseño **plano**: `shadow-sm` solo en superficies que flotan (cards de Kanban, popovers, dropdowns, dialogs). La profundidad se da con `border` + contraste de superficie (`card` vs `base` vs `muted`), no con sombras pesadas.

## Shapes

Radio base **`0.625rem`** con escala (`sm/md/lg/xl/2xl`). Inputs/botones `rounded-md`, cards `rounded-xl`, badges `rounded-md`, logos `rounded-xl`. No "rounded-full" en todo.

## Components

- **C1 · shadcn primero.** Descargar/usar el primitivo; **no escribir UI a mano que duplique uno**. Customizar después vía tokens.
- **C2 · Reusar `components/admin/` antes de crear.** Catálogo: **DataTable** (TanStack v8), **KpiCard**, **ConfirmDialog**, **TwoFaDialog**, **CountryFilter**, **PeriodSelector**, **AssetUpload** / **CampaignAssetUpload**, **AuditTrail**, **MessagePreview**, **CampaignForm**, `data-table-column-header`/`-pagination`.
- **C3 · Estados obligatorios.** Toda vista con datos = **loading (Skeleton con shimmer) / empty (mensaje útil + acción) / error**. Sin pantallas en blanco.
- **C4 · Forms = familia `Field`** (radix-nova: `Field/FieldLabel/FieldDescription/FieldError/FieldGroup`) + `react-hook-form` (`Controller`). No existe `FormField` legacy. Errores **por campo**.
- Primitivos: **Button** `rounded-md`, `h-9`, variantes default/secondary/outline/ghost/destructive/link (peligrosas → `destructive`); **Card** `bg-card`, `rounded-xl`, `border`; **Badge** con **label** (no solo color).

## UX / interacción

- **U1 · Feedback en toda mutación.** `toast` (`sonner`): `success` con el **resultado concreto** ("3 borradas"), `error` con el `message` del backend.
- **U2 · Confirmación según riesgo.** Acción destructiva/sensible → **`ConfirmDialog`**; acción **crítica** (dinero, grants, permisos) → **`TwoFaDialog`**.
- **U3 · Permisos en la UI.** Lo que el rol no puede hacer **no se renderiza** (`can(...)`); la página se protege server-side con `requireAction(...)`. Nunca un botón que va a dar 403.
- **U4 · Micro-interacciones (emil).** Ver §Vida y movimiento: press feedback, easing/duración correctos, sin animar lo repetido.
- **U5 · Estado nunca solo por color.** Siempre ícono/texto además del color.
- **U6 · Forms cortos → MODAL, no página.** Crear/editar que **entra cómodo en un diálogo** (≈ ≤ 6–8 campos, un bloque, sin tabs ni listas dinámicas) se abre como **modal desde la tabla/lista** — no se navega a `/new` ni `/[id]/edit`. La **página propia** se reserva para forms **largos/complejos** (secciones, `useFieldArray`, multi-paso) o cuando el contexto lo pide (ej. factura con ítems).

## Proceso / convenciones

- **P1 · Arquitectura BFF.** El cliente **nunca** llama al backend directo → `app/api/.../route.ts` (`forwardToBackend`) → hook `hooks/use-X.ts` (TanStack Query + `unwrapData`).
- **P2 · Estructura de sección.** `page.tsx` (**server**, `requireAction`) + `*-table` / `*-form` / `*-detail.tsx` (**cliente**).
- **P3 · Cada página define su `<title>`** (`export const metadata`).
- **P4 · Gobernanza.** Fuente de verdad de marca = la app (`../frontend/src/theme`); el panel **implementa**. Una regla se documenta acá cuando un patrón se repite **≥3 veces**.

## Estado y alineación (panel ↔ marca)

La marca **ya está aplicada**. Referencia de lo hecho:
1. **Colores** → `globals.css` mapea los tokens shadcn a la marca: `--primary` = teal `#408D99` (+ `--ring`, `--sidebar-primary`), `--destructive` = coral, y superficies/borde a los valores light/dark de arriba (hex directo). ✅
2. **Tipografía** → **solo Poppins** (400/500/600/700) vía `next/font/google` en `app/layout.tsx`, expuesta como `--font-sans` (y `--font-heading`). ✅
3. **Logo / favicon** → wordmark `public/logo.svg` en el login; ícono cuadrado `public/icon.svg` en el sidebar (cabe al colapsar); favicon `public/favicon.ico` vía `metadata.icons`. ✅
4. **Gate de auth** → `proxy.ts` excluye del matcher las rutas con extensión (assets de `public/`); si no, los redirige a `/login` sin sesión. ✅

## Do's and Don'ts

**Do**: layout que calza y aprovecha el espacio sin saturar (un solo scroll, sin overflow); dar **vida** con la paleta de Kodi + micro-interacciones con craft (emil); tokens semánticos (dark gratis); reusar shadcn + `components/admin/`; loading/empty/error en toda vista; **forms cortos en modal**; feedback (toast) en cada mutación; navegación por teclado + `aria-label`; respetar escala 4px y jerarquía; cada página con su `<title>`.

**Don't** (todo esto huele a "hecho por IA" → Regla #1): degradados morados/índigo, glassmorphism, todo `rounded-2xl`, sombras pesadas, hero genéricos; scrollbars internos accidentales / scroll horizontal / huecos muertos; animar lo repetido (filtros/paginación/navegación/teclado); estado solo por color; hex crudos o px arbitrarios en el markup; reescribir a mano un componente que ya existe; mandar a una página `/new` o `/[id]/edit` un form que cabe en un modal.
