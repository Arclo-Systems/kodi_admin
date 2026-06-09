import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Seedea el fixture de Cupones (cupón + canje del admin) corriendo el script del
// backend hermano, igual que scripts/gen-types.mjs. Hace el e2e auto-suficiente
// (no depende del estado ambiente de la BD). E2E_SKIP_SEED=1 lo salta (si el seed
// corre por separado, ej. otro job de CI).
export default function globalSetup(): void {
  if (process.env.E2E_SKIP_SEED) return;
  const backendDir = process.env.KODI_BACKEND_DIR ?? resolve(process.cwd(), '../backend');
  if (!existsSync(backendDir)) {
    throw new Error(
      `Backend no encontrado en ${backendDir}. Seteá KODI_BACKEND_DIR o E2E_SKIP_SEED=1.`,
    );
  }
  execSync('npm run seed:e2e', { cwd: backendDir, stdio: 'inherit' });
}
