import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { COUNTRIES } from '@/lib/countries';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardHome() {
  const user = await requireAction('view:dashboard');
  // Lista efectiva de países según scope (global → todos; regional → su scope).
  const allowedCountries = user.isGlobalScope
    ? COUNTRIES.map((c) => c.code)
    : user.assignedCountries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hola, {user.displayName.split(' ')[0]}</h1>
        <p className="text-muted-foreground">
          Vista general de Kodi: engagement, economía y salud del sistema.
        </p>
      </div>
      <DashboardOverview allowedCountries={allowedCountries} />
    </div>
  );
}
