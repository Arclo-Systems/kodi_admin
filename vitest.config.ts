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
    // Con el default (núcleos - 1) los workers de jsdom se reparten la CPU y los tests que abren
    // varios `Select` de Radix pasan los 5 s por espera, no por su código. Se limita la
    // concurrencia en vez de subir el timeout, que escondería un test lento de verdad.
    maxWorkers: '50%',
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
