import { test, expect } from '@playwright/test';

// Borrar `admin_at` deja el mismo estado que tener el access token vencido: el browser lo
// descarta a los 15 min y sobrevive solo el refresh token. Es el escenario que echaba al
// admin del panel sin aviso.
async function expireAccessToken(context: {
  cookies: () => Promise<{ name: string }[]>;
  clearCookies: (filter: { name: string }) => Promise<void>;
}): Promise<void> {
  const before = await context.cookies();
  expect(before.map((c) => c.name)).toContain('admin_rt');
  await context.clearCookies({ name: 'admin_at' });
}

test('access vencido + rt válido → sigo dentro sin pasar por /login', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expireAccessToken(context);

  await page.getByRole('link', { name: 'Usuarios' }).click();

  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
});

test('access vencido: los datos del panel siguen cargando (XHR refresca)', async ({
  page,
  context,
}) => {
  await page.goto('/users');
  await expect(page.getByPlaceholder(/Email, username/)).toBeVisible();
  await expireAccessToken(context);

  // Filtrar dispara una query nueva contra /api/admin/users con el access ya vencido.
  await page.getByPlaceholder(/Email, username/).fill('kodi');

  await expect(page).toHaveURL(/\/users/);
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
});

test('el refresh deja la sesión utilizable (cookies renovadas)', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expireAccessToken(context);

  await page.goto('/users');

  const after = await context.cookies();
  expect(after.map((c) => c.name)).toContain('admin_at');
  // El vencimiento publicado para el aviso de expiración viaja con el refresh.
  const expiry = after.find((c) => c.name === 'admin_at_exp');
  expect(Number(expiry?.value)).toBeGreaterThan(Date.now());
});
