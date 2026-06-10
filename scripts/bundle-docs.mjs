// Empaqueta el manual (kodi-docs) dentro del deploy del panel: construye el sitio
// estático y copia su dist/ a docs-dist/, que el route handler /docs sirve detrás
// de la sesión (y next.config incluye en el bundle serverless).
//
// Fuente del manual, en orden:
//   1. DOCS_REPO_DIR (o ../kodi-docs, el checkout hermano local).
//   2. Clon superficial de DOCS_REPO_URL con DOCS_REPO_TOKEN (CI/Vercel, repo privado).
// Si no hay fuente disponible, AVISA y sale en 0: el panel se deploya igual sin
// manual (/docs responde 404) — el manual nunca debe tumbar un deploy del panel.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const OUT = path.join(root, 'docs-dist');

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
// Para comandos cuyo error puede contener el token (el clon): captura la salida y la
// re-emite redactada en vez de heredar stdio (git imprime la URL con credenciales al fallar).
function runRedacted(cmd, cwd, secret) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe' });
  } catch (err) {
    const out = [err.message, err.stderr?.toString(), err.stdout?.toString()]
      .filter(Boolean)
      .join('\n')
      .replaceAll(secret, '***');
    throw new Error(out);
  }
}
function skip(reason) {
  console.warn(`[bundle-docs] AVISO: ${reason} — el panel se construye SIN el manual (/docs dará 404).`);
  process.exit(0);
}

let src = process.env.DOCS_REPO_DIR ?? path.join(root, '..', 'kodi-docs');
let cloned = false;

let failure = null;
try {
  if (!fs.existsSync(path.join(src, 'package.json'))) {
    const repo = process.env.DOCS_REPO_URL ?? 'https://github.com/Arclo-Systems/Kodi_docs_sistema.git';
    const token = process.env.DOCS_REPO_TOKEN;
    if (!token) throw new Error('no existe ../kodi-docs ni hay DOCS_REPO_TOKEN para clonar el repo privado');
    src = fs.mkdtempSync(path.join(os.tmpdir(), 'kodi-docs-'));
    cloned = true;
    // El token va embebido solo en la URL del clon (el remote vive en un dir temporal que se borra
    // en el finally) y su salida se redacta para que nunca llegue al log del build.
    const url = repo.replace('https://', `https://x-access-token:${token}@`);
    console.log(`[bundle-docs] clonando ${repo} ...`);
    runRedacted(`git clone --depth 1 "${url}" .`, src, token);
  }

  if (!fs.existsSync(path.join(src, 'node_modules'))) run('npm ci', src);
  console.log(`[bundle-docs] construyendo el manual en ${src} ...`);
  run('npm run build', src);

  const dist = path.join(src, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error(`el build no produjo ${dist}/index.html`);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.cpSync(dist, OUT, { recursive: true });
  // Carpeta generada: se auto-ignora para no depender del .gitignore raíz.
  fs.writeFileSync(path.join(OUT, '.gitignore'), '*\n');
} catch (err) {
  failure = err instanceof Error ? err.message : String(err);
} finally {
  // process.exit() se saltaría este bloque: por eso los errores se acumulan y se reporta al final.
  if (cloned) fs.rmSync(src, { recursive: true, force: true });
}

if (failure) skip(failure);
console.log(`[bundle-docs] OK → ${OUT}`);
