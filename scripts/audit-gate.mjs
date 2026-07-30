#!/usr/bin/env node
// Gate de seguridad del panel: falla ante cualquier alerta high/critical que
// no esté en la lista de excepciones. Las excepciones son avisos SIN versión
// parcheada usable, no deuda que se pueda pagar hoy — cada una lleva motivo y
// fecha de revisión. Al revisarla: si ya hay fix, se saca de acá y se sube.
//
// Usa `npm audit --omit=dev`: lo que solo vive en el toolchain de desarrollo
// no se despliega. La corrida completa queda como paso informativo en CI.
import { execSync } from 'node:child_process';

const EXCEPTIONS = {
  postcss: {
    reason:
      'Va clavado dentro de next (8.4.31, pin exacto que ignora overrides). La falla ' +
      'lee archivos .map al procesar CSS en build-time, sobre CSS propio: sin entrada ' +
      'de usuario y sin alcance desde una petición en producción.',
    review: '2026-09-01',
  },
  'brace-expansion': {
    reason:
      'Entra por glob, que trae el plugin de Sentry para subir source maps (build-time). ' +
      'El aviso marca vulnerable todo <=5.0.7 y la 5.x cambia la forma del export, así ' +
      'que forzarla rompe a minimatch y glob.',
    review: '2026-09-01',
  },
};

const BLOCKING = new Set(['high', 'critical']);

function runAudit() {
  try {
    return execSync('npm audit --omit=dev --json', {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    // npm audit sale con código ≠ 0 cuando encuentra algo; el JSON igual viene.
    if (err.stdout) return err.stdout;
    throw err;
  }
}

const report = JSON.parse(runAudit());
const found = Object.entries(report.vulnerabilities ?? {}).filter(([, v]) =>
  BLOCKING.has(v.severity),
);

const unexpected = found.filter(([name]) => !(name in EXCEPTIONS));
const accepted = found.filter(([name]) => name in EXCEPTIONS);
const stale = Object.entries(EXCEPTIONS).filter(
  ([, e]) => new Date(e.review) < new Date(),
);

console.log('Gate de seguridad — dependencias de producción\n');

for (const [name, vuln] of accepted) {
  const { reason, review } = EXCEPTIONS[name];
  console.log(`  ~ ${name} (${vuln.severity}) — aceptada hasta ${review}`);
  console.log(`    ${reason}\n`);
}

if (stale.length > 0) {
  console.log('⚠ Excepciones vencidas — revisar si ya hay parche:');
  for (const [name, e] of stale) console.log(`    ${name} (vencía ${e.review})`);
  console.log('');
}

if (unexpected.length > 0) {
  console.error('✖ Alertas altas nuevas, sin excepción registrada:\n');
  for (const [name, vuln] of unexpected) {
    const fix = vuln.fixAvailable;
    const how =
      fix === true
        ? 'npm audit fix'
        : fix
          ? `subir ${fix.name} a ${fix.version}${fix.isSemVerMajor ? ' (versión mayor)' : ''}`
          : 'sin fix publicado';
    console.error(`    ${name} (${vuln.severity}) → ${how}`);
  }
  console.error('\nArreglalas o, si no tienen fix usable, agregalas a EXCEPTIONS');
  console.error('en scripts/audit-gate.mjs con motivo y fecha de revisión.');
  process.exit(1);
}

console.log('✓ Sin alertas altas fuera de la lista de excepciones.');
