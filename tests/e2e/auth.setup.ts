import { test as setup, expect } from '@playwright/test';

// "Setup project": loguea UNA vez y guarda el storageState que el resto de specs reusa.
// Evita el login-por-spec que causaba flake al correr la suite en paralelo
// (logins concurrentes del mismo admin + rotación de refresh token).
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'emiliorb26@gmail.com';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'KodiDev2026!';
const STORAGE_STATE = 'tests/e2e/.auth/admin.json';

setup('autentica al admin y guarda el storageState', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#login-email', EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('http://localhost:3001/');
  await page.context().storageState({ path: STORAGE_STATE });
});
