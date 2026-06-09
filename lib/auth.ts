import { cookies } from 'next/headers';
import { unwrapData } from './bff';

export type AdminRole = 'admin' | 'editor' | 'support' | 'commercial';

export type AdminActiveStatus = 'active' | 'inactive' | 'pending_first_login';

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isGlobalScope: boolean;
  assignedCountries: string[];
  adminActiveStatus: AdminActiveStatus | null;
  requirePasswordChange: boolean;
};

/** Lee la cookie del access token (server-side). */
async function readAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get('admin_at')?.value ?? null;
}

/** Fetch al backend desde el server reenviando las cookies HTTP-only. */
export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const store = await cookies();
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      cookie: store.toString(),
      'content-type': 'application/json',
    },
    cache: 'no-store',
  });
}

/** Perfil del admin actual desde el backend. null si no hay sesión válida. */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  if (!(await readAccessToken())) return null;
  try {
    const res = await adminFetch('/v1/admin/auth/me');
    if (!res.ok) return null;
    return unwrapData<AdminUser>(await res.json()) ?? null;
  } catch {
    return null;
  }
}
