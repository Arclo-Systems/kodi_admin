import { redirect } from 'next/navigation';
import { getCurrentAdmin, type AdminUser } from './auth';
import { canWithScope, type Action } from './permissions';

// Guard server-side. Llamar al inicio de cada page Server Component que requiera
// permiso. Devuelve el admin si está autorizado; si no, redirige. La autoridad real
// son los guards del backend — esto es UX (evita render de páginas sin permiso).
export async function requireAction(action: Action): Promise<AdminUser> {
  const user = await getCurrentAdmin();
  if (!user) redirect('/login');
  if (user.requirePasswordChange) redirect('/change-password');
  if (!canWithScope(user.role, user.isGlobalScope, action)) redirect('/');
  return user;
}
