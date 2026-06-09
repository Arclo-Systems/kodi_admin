import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { COUNTRIES } from '@/lib/countries';
import { UsersTable } from './users-table';

export const metadata: Metadata = { title: 'Usuarios' };

export default async function UsersPage() {
  const user = await requireAction('view:users');
  // Lista efectiva de países según scope (global → todos; regional → su scope).
  const allowedCountries = user.isGlobalScope
    ? COUNTRIES.map((c) => c.code)
    : user.assignedCountries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-muted-foreground">Gestiona usuarios finales</p>
      </div>
      <UsersTable allowedCountries={allowedCountries} />
    </div>
  );
}
