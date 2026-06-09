# Changelog

Todos los cambios notables de **kodi-admin** se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).
Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/) + gitmoji.

## [Unreleased]

Base de producción reconstruida en un historial limpio por fases (2026-06-08).
La historia previa (20+ ramas de desarrollo) quedó archivada en un backup `git bundle`
fuera del repositorio.

### Added
- Fundación del proyecto: scaffold Next 16 + TypeScript estricto + tooling (ESLint, Vitest, Playwright, Sentry, CI).
- Principios de ingeniería y estándares de release ([`PRINCIPLES.md`](./PRINCIPLES.md)).
- Sistema de diseño (tokens de marca + primitivos shadcn) y catálogo de componentes compartidos.
- Capa BFF (`/api/admin/*`) + hooks de datos (TanStack Query) tipados desde OpenAPI.
- Panel de administración completo (auth + dominios: usuarios, contenido, economía, moderación, mensajería, juego, sistema).
- Framework de auditoría técnica por fases ([`docs/technical-audit-2026-06-08.md`](./docs/technical-audit-2026-06-08.md)).

[Unreleased]: https://example.com/kodi-admin/tree/main
