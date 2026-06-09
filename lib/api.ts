// Cliente OpenAPI tipado SERVER-side (Server Components / route handlers).
// Decisión BFF: el browser NO llama cross-origin al backend; pega a route
// handlers `/api/admin/*` (same-origin) que reenvían al backend. Los Client
// Components usan hooks de TanStack Query contra esos proxies, tipados desde
// `paths` de types/api.ts. Este cliente reenvía las cookies HTTP-only.
import createClient from 'openapi-fetch';
import { cookies } from 'next/headers';
import type { paths } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function serverApi() {
  const cookieStore = await cookies();
  return createClient<paths>({
    baseUrl: API_URL,
    headers: { cookie: cookieStore.toString() },
  });
}
