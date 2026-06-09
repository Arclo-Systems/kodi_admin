#!/usr/bin/env node
// Genera types/api.ts desde el spec OpenAPI del backend Kodi.
//
// Dos fuentes:
//  - LOCAL (default): genera openapi.json desde el backend hermano (npm run
//    openapi:export) y tipa desde ahí. No requiere backend desplegado.
//  - REMOTO (CI/deploy): si KODI_API_URL está seteada, hace fetch de
//    `$KODI_API_URL/v1/openapi.json` (con X-Admin-OpenAPI-Token si hay OPENAPI_TOKEN).
//    Requiere que el backend exponga ese endpoint (pendiente — ver N/O).
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'types/api.ts');

async function resolveSpecPath() {
  const apiUrl = process.env.KODI_API_URL;
  if (apiUrl) {
    const url = `${apiUrl.replace(/\/$/, '')}/v1/openapi.json`;
    const headers = {};
    if (process.env.OPENAPI_TOKEN) headers['X-Admin-OpenAPI-Token'] = process.env.OPENAPI_TOKEN;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`❌ fetch ${url} → ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    const tmp = resolve(root, 'types/.openapi.tmp.json');
    writeFileSync(tmp, await res.text());
    return { spec: tmp, cleanup: () => rmSync(tmp, { force: true }), origin: url };
  }

  const backendDir = process.env.KODI_BACKEND_DIR ?? resolve(root, '../backend');
  if (!existsSync(backendDir)) {
    console.error(`❌ No encuentro el backend en ${backendDir}. Seteá KODI_BACKEND_DIR o KODI_API_URL.`);
    process.exit(1);
  }
  execSync('npm run openapi:export', { cwd: backendDir, stdio: 'inherit', shell: true });
  const spec = resolve(backendDir, 'openapi.json');
  if (!existsSync(spec)) {
    console.error(`❌ El backend no generó ${spec}.`);
    process.exit(1);
  }
  return { spec, cleanup: () => {}, origin: spec };
}

const { spec, cleanup, origin } = await resolveSpecPath();
try {
  execSync(`npx openapi-typescript "${spec}" -o "${out}"`, { cwd: root, stdio: 'inherit', shell: true });
} finally {
  cleanup();
}
console.log(`✅ types/api.ts generado desde ${origin}`);
