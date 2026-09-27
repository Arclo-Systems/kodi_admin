import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it, expect } from 'vitest';

// Tres e2e entraban a pantallas que no existen (/economy/scholarships se borró en
// 8bc547a; /economy/missions/config y /economy/store/inventory no existieron
// nunca). Esas pruebas solo corren contra staging, así que nadie se enteraba.
// Esta guardia no necesita red: cada `goto` tiene que tener su `page.tsx`.

const ROOT = join(__dirname, '..', '..');
const APP = join(ROOT, 'app');
const E2E = join(ROOT, 'tests', 'e2e');

function filesUnder(dir: string, match: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full, match);
    return match(entry.name) ? [full] : [];
  });
}

/** Segmentos de URL de cada `page.tsx`, sin los grupos `(panel)`, `(auth)`. */
function pageRoutes(): string[][] {
  return filesUnder(APP, (name) => name === 'page.tsx').map((file) =>
    relative(APP, file)
      .split(sep)
      .slice(0, -1)
      .filter((segment) => !/^\(.*\)$/.test(segment)),
  );
}

const DYNAMIC = '__dinamico__';

/** Rutas de los `goto`; cada `${…}` de un template literal es un segmento dinámico. */
function gotoTargets(): { spec: string; path: string }[] {
  const pattern = /\.goto\(\s*(['"`])([^'"`]*)\1/g;
  return filesUnder(E2E, (name) => name.endsWith('.ts')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(pattern)].map((m) => ({
      spec: relative(ROOT, file),
      path: (m[2] ?? '').replace(/\$\{[^}]*\}/g, DYNAMIC).split(/[?#]/)[0] ?? '',
    })),
  );
}

function routeExists(path: string, routes: string[][]): boolean {
  const wanted = path.split('/').filter(Boolean);
  return routes.some(
    (route) =>
      route.length === wanted.length &&
      route.every((segment, i) =>
        /^\[.*\]$/.test(segment) ? true : segment === wanted[i],
      ),
  );
}

describe('e2e del panel — rutas vivas', () => {
  const routes = pageRoutes();
  const targets = gotoTargets();

  it('encuentra las pantallas y los goto (la guardia no está mirando al vacío)', () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(targets.length).toBeGreaterThan(20);
  });

  it('cada goto de tests/e2e apunta a una ruta con page.tsx', () => {
    const rotas = targets
      .filter(({ path }) => !routeExists(path, routes))
      .map(({ spec, path }) => `${spec} → ${path.replaceAll(DYNAMIC, ':id')}`);

    expect(rotas).toEqual([]);
  });
});
