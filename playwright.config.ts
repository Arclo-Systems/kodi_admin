import { defineConfig, devices } from '@playwright/test';

// storageState compartido: el project "setup" loguea una vez y lo guarda; el resto lo reusa
// (evita el login-por-spec que causaba flake al correr en paralelo).
const STORAGE_STATE = 'tests/e2e/.auth/admin.json';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  // Reintenta el flake ambiental del dev server (Turbopack compila on-demand → bajo carga
  // paralela el click puede caer en un elemento aún no hidratado). Activa el trace on-first-retry.
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
