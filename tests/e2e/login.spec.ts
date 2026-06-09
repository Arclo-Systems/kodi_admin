import { test, expect } from '@playwright/test';

// Este spec PRUEBA el login → corre SIN storageState (contexto sin autenticar).
test.use({ storageState: { cookies: [], origins: [] } });

// Requieren el backend Kodi corriendo en NEXT_PUBLIC_API_URL (:3000) con un admin seedeado.
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'emiliorb26@gmail.com';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'KodiDev2026!';

test('login con credenciales válidas redirige al panel', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#login-email', EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('http://localhost:3001/');
  // El panel renderiza con la nav filtrada por rol (admin ve Usuarios/Admins).
  await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible();
});

test('login con credenciales inválidas muestra error', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#login-email', 'wrong@test.local');
  await page.fill('#login-password', 'wrongpassword');
  await page.click('button[type=submit]');
  await expect(page.getByText('Credenciales inválidas')).toBeVisible();
});
