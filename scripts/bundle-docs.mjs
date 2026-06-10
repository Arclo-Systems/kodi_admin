// Empaqueta los sitios de documentación dentro del deploy del panel: construye cada
// sitio estático (Astro) y copia su dist/ al directorio que el route handler sirve
// detrás de la sesión (y que next.config incluye en el bundle serverless).
//
// Fuente de cada sitio, en orden:
//   1. <dirEnv> (o ../<sibling>, el checkout hermano local).
//   2. Clon superficial de <urlEnv|defaultUrl> con DOCS_REPO_TOKEN (CI/Vercel, repos privados).
// Si un sitio no tiene fuente disponible o falla su build, AVISA y se sigue con el
// resto: la documentación nunca debe tumbar un deploy del panel (su ruta dará 404).

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();

const SITES = [
  {
    name: 'manual',
    dirEnv: 'DOCS_REPO_DIR',
    sibling: 'kodi-docs',
    urlEnv: 'DOCS_REPO_URL',
    defaultUrl: 'https://github.com/Arclo-Systems/Kodi_docs_sistema.git',
    out: 'docs-dist',
    route: '/docs',
  },
  {
    name: 'tecnica',
    dirEnv: 'TECH_DOCS_REPO_DIR',
    sibling: 'kodi-docs-tecnica',
    urlEnv: 'TECH_DOCS_REPO_URL',
    defaultUrl: 'https://github.com/Arclo-Systems/kodi_docs_tecnica.git',
    out: 'tecnica-dist',
    route: '/tecnica',
  },
];

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

function bundleSite(site) {
  let src = process.env[site.dirEnv] ?? path.join(root, '..', site.sibling);
  let cloned = false;
  try {
    if (!fs.existsSync(path.join(src, 'package.json'))) {
      const repo = process.env[site.urlEnv] ?? site.defaultUrl;
      const token = process.env.DOCS_REPO_TOKEN;
      if (!token)
        throw new Error(`no existe ../${site.sibling} ni hay DOCS_REPO_TOKEN para clonar el repo privado`);
      src = fs.mkdtempSync(path.join(os.tmpdir(), `${site.sibling}-`));
      cloned = true;
      // El token va embebido solo en la URL del clon (el remote vive en un dir temporal que se
      // borra en el finally) y su salida se redacta para que nunca llegue al log del build.
      const url = repo.replace('https://', `https://x-access-token:${token}@`);
      console.log(`[bundle-docs] (${site.name}) clonando ${repo} ...`);
      runRedacted(`git clone --depth 1 "${url}" .`, src, token);
    }

    if (!fs.existsSync(path.join(src, 'node_modules'))) run('npm ci', src);
    console.log(`[bundle-docs] (${site.name}) construyendo en ${src} ...`);
    run('npm run build', src);

    const dist = path.join(src, 'dist');
    if (!fs.existsSync(path.join(dist, 'index.html')))
      throw new Error(`el build no produjo ${dist}/index.html`);

    const out = path.join(root, site.out);
    fs.rmSync(out, { recursive: true, force: true });
    fs.cpSync(dist, out, { recursive: true });
    // Carpeta generada: se auto-ignora para no depender del .gitignore raíz.
    fs.writeFileSync(path.join(out, '.gitignore'), '*\n');
    console.log(`[bundle-docs] (${site.name}) OK → ${out}`);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  } finally {
    if (cloned) fs.rmSync(src, { recursive: true, force: true });
  }
}

for (const site of SITES) {
  const failure = bundleSite(site);
  if (failure) {
    console.warn(
      `[bundle-docs] AVISO (${site.name}): ${failure} — el panel se construye SIN este sitio (${site.route} dará 404).`,
    );
  }
}
