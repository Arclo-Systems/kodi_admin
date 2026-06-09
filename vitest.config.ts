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
