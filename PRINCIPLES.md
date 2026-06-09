# Principios — kodi-admin

Principios de ingeniería y estándares de release del panel de administración de Kodi.
Para los principios de **UI/diseño** ver [`DESIGN.md`](./DESIGN.md); para la **auditoría técnica**
por fases ver [`docs/technical-audit-2026-06-08.md`](./docs/technical-audit-2026-06-08.md).

## 1. Estándar de calidad: 100% completo

Nada se da por terminado con "pasadas por encima". Cada unidad (ruta, hook, componente, endpoint)
se trata individualmente y **no se marca como hecho sin verificación real**. Sin *rubber-stamp*.

## 2. Código

- **TypeScript** siempre sobre JavaScript. **Nunca `any`** — tipos propios, generics o `unknown`.
- **Clean Code**: nombres con significado, funciones chicas y enfocadas, SRP, DRY, abstracciones que ganan su complejidad.
- Comentarios solo para el **porqué** no obvio; cero comentarios que narran el **qué**; cero código muerto.
- `tsconfig` estricto: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.

## 3. Arquitectura

- **BFF**: el browser pega a route handlers `/api/admin/*` (same-origin); nunca cross-origin al backend.
- **Validar en los bordes** (route handlers, forms) con `zod`; tratar toda respuesta externa como no confiable.
- **Server/Client**: `'use client'` solo donde hace falta interactividad; lógica de datos pesada en RSC.
- **Tipos desde el contrato**: `types/api.ts` se genera del OpenAPI del backend (`npm run gen:types`).
- Capas con responsabilidad única: `app/` (rutas) · `components/` (UI) · `hooks/` (datos) · `lib/` (núcleo).

## 4. Seguridad

- Autorización en **cada** acción server-side (`can()` / `requireAction`), no solo autenticación.
- Sesiones con cookies `httpOnly`/`secure`/`sameSite`; tokens nunca en `localStorage`.
- Cero secretos en el repo (`.env*` ignorado; solo `.example` se commitea); markdown/HTML por `rehype-sanitize`.

## 5. Tests

- Comportamiento probado, no implementación. Unit con Vitest; e2e con Playwright en flujos críticos.
- Todo bug fix incluye test de reproducción que falla **antes** del arreglo.

## 6. Commits y versionado

- [Conventional Commits](https://www.conventionalcommits.org/) + gitmoji (`✨ feat`, `🐛 fix`, `♻️ refactor`, `📝 docs`, `🔧 chore`…).
- Commits **atómicos** (una cosa lógica); refactor separado de feature; mensaje explica el **porqué**.
- Sin secretos en el diff; sin cambios de formato mezclados con comportamiento.
- Cada cambio notable se registra en [`CHANGELOG.md`](./CHANGELOG.md) ([Keep a Changelog](https://keepachangelog.com/)).
- Sin `Co-Authored-By` en los mensajes.

## 7. Puerta de calidad (release)

Ningún cambio entra a producción sin:

```bash
npm run ci          # lint + typecheck + test + build, en verde
npx knip            # sin archivos/exports/deps huérfanos
npm audit           # sin vulnerabilidades críticas/altas
```

Más el avance de las fases del [framework de auditoría técnica](./docs/technical-audit-2026-06-08.md).
