// El contrato de contenido rico es canónico en `../docs/contracts/`, que no está en el git de este
// repo: en CI (o en un clon sin `docs/`) los tests no podrían importarlo. Por eso cada repo lleva
// una copia vendorizada y commiteada, y este script la compara contra el canónico.
//
//   node scripts/contracts.mjs          → falla si la copia quedó vieja (contracts:check)
//   node scripts/contracts.mjs --sync   → la actualiza desde el canónico (contracts:sync)
//
// Sin `docs/contracts/` no hay nada que comparar y sale 0: el chequeo no puede romper un CI que
// clona solo este repo.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CANONICAL_DIR = join(ROOT, '..', 'docs', 'contracts');
const VENDORED_DIR = join(ROOT, 'components', 'rich-content', '__contracts__');
const FILES = ['rich-content-fixtures.json', 'rich-tools.json'];

const sync = process.argv.includes('--sync');

if (!existsSync(CANONICAL_DIR)) {
  console.log('docs/contracts/ no está en este árbol: se usa la copia vendorizada tal cual.');
  process.exit(0);
}

// Se compara el JSON parseado, no el texto: git normaliza los saltos de línea de la copia
// vendorizada (autocrlf) y el canónico vive fuera de git.
function normalize(raw) {
  return JSON.stringify(JSON.parse(raw));
}

let drift = 0;
for (const file of FILES) {
  const canonical = readFileSync(join(CANONICAL_DIR, file), 'utf8');
  const vendoredPath = join(VENDORED_DIR, file);
  const vendored = existsSync(vendoredPath) ? readFileSync(vendoredPath, 'utf8') : null;

  if (vendored !== null && normalize(vendored) === normalize(canonical)) continue;

  if (sync) {
    writeFileSync(vendoredPath, canonical);
    console.log(`sincronizado: ${file}`);
  } else {
    console.error(`desincronizado: ${file} — corré \`npm run contracts:sync\` y commiteá la copia.`);
    drift += 1;
  }
}

process.exit(drift > 0 ? 1 : 0);
