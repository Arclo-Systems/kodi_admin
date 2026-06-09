# Contribuir a kodi-admin

Gracias por contribuir. Esta guía cubre el flujo de trabajo; para arquitectura y convenciones de
código ver [`AGENTS.md`](./AGENTS.md) y [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Requisitos

- **Node ≥ 24.15** (o `^22.22.2 || >=26`); ver `engines` en `package.json`.
- El backend Kodi hermano (`../backend`) para `gen:types` y los e2e.

Setup: ver [`README.md`](./README.md#setup).

## Flujo

1. Ramá desde `main`: `feat/...`, `fix/...`, `docs/...`.
2. Hacé cambios pequeños y enfocados (refactor separado de feature).
3. **Antes de abrir el PR**, que pase la definición de "hecho":
   ```bash
   npm run ci        # lint + typecheck + test + build
   npx knip          # sin código/deps muertas
   npm audit         # sin críticas/altas
   ```
4. Si tocaste contratos del backend: `npm run gen:types:check`.

## Convención de commits

**Conventional Commits + gitmoji**: `<emoji> <type>(<scope>): <subject>`.

```
✨ feat(economy): tabla de precios de suscripción por país
🐛 fix(bff): forwardToBackend preserva query params repetidos
📝 docs(architecture): diagrama de capas BFF
♻️ refactor(hooks): extrae helper send compartido
```

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Subject en español, imperativo, sin punto final.
- **Nunca** incluir `Co-Authored-By`.

La convención está especificada en [`commitlint.config.cjs`](./commitlint.config.cjs). Para activar el
chequeo automático en cada commit:

```bash
npm i -D @commitlint/cli @commitlint/config-conventional husky
npx husky init
echo 'npx --no -- commitlint --edit $1' > .husky/commit-msg
```

## Estilo de código

- **TypeScript estricto, cero `any`** (tipos propios / generics / `unknown`).
- **UI = shadcn** (primitivos del registry + `components/admin`); forms con la familia `Field` +
  `react-hook-form` + `zodResolver`.
- **Datos** vía hooks de TanStack Query contra `/api/admin/*`; `queryKey` namespaced + invalidación.
- Comentarios solo del *por qué*. Sin código comentado ni `TODO` colados.

El detalle de patrones y gotchas está en [`AGENTS.md`](./AGENTS.md).
