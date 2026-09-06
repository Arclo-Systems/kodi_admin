import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Pool 'threads': el pool 'forks' por defecto a veces no arranca sus workers en Windows
    // ("Timeout waiting for worker to respond") y deja el step de tests sin correr. Threads es
    // fiable para jsdom + RTL.
    pool: 'threads',
    // Los 5 s por defecto alcanzan para un test suelto pero no para la suite
    // completa: abrir un `Select` de Radix en jsdom cuesta ~1 s, un test que
    // encadena cuatro tarda 2 s en frío y con 82 archivos en paralelo se pasa de
    // los 5 s. Los que fallaban así (formulario de finanzas, árbol de cuentas,
    // categorías) pasan sueltos y en verde: era el reloj, no el código.
    testTimeout: 20_000,
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['node_modules', '.next', 'tests/e2e'],
  },
  resolve: {
    alias: {
      '@': resolve(fileURLToPath(new URL('.', import.meta.url))),
    },
  },
});
