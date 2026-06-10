import { test, expect } from '@playwright/test';

// Los dos sitios estáticos servidos detrás de la sesión (manual /docs y técnica /tecnica)
// comparten lib/static-site.ts: una regresión ahí afecta a ambos (el manual está en prod).
const SITES = ['/docs/', '/tecnica/'] as const;

for (const base of SITES) {
  test(`${base} sin sesión redirige a /login`, async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    // Next antepone su propio 308 (normaliza la barra final) al 307 del handler:
    // se sigue la cadena completa y se asierta el destino final.
    const res = await ctx.request.get(base);
    expect(res.url()).toContain('/login');
    expect(res.status()).toBe(200);
    await ctx.close();
  });

  test(`${base} con sesión responde el sitio`, async ({ request }) => {
    const res = await request.get(base);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/html');
    expect(res.headers()['cache-control']).toContain('no-cache');
  });

  test(`${base} bloquea path traversal`, async ({ request }) => {
    const res = await request.get(`${base}x/..%2f..%2fpackage.json`);
    // 404 del handler (segmento con "..") o de Next (normaliza la ruta fuera del matcher):
    // lo que importa es que el archivo fuera del dist JAMÁS se sirva.
    expect(res.status()).toBe(404);
  });

  test(`${base} página inexistente devuelve la 404 de Astro`, async ({ request }) => {
    const res = await request.get(`${base}no-existe/`);
    expect(res.status()).toBe(404);
  });
}
