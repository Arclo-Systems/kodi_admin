import { requireAction } from '@/lib/guard';
import { COUNTRIES } from '@/lib/countries';
import { LeaguesTabs } from './leagues-tabs';

export const metadata = { title: 'Ligas' };

export default async function LeaguesPage() {
  const user = await requireAction('leagues:config:write');
  // Países que el admin puede consultar (global → todos; regional → su scope).
  const allowedCountries = user.isGlobalScope ? COUNTRIES.map((c) => c.code) : user.assignedCountries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ligas</h1>
        <p className="text-muted-foreground">
          Fracción y tope de ascenso/descenso + premio por puesto, por tier y país. Aprendiz no
          desciende (piso); Genio no asciende (techo).
        </p>
      </div>
      <LeaguesTabs allowedCountries={allowedCountries} />
    </div>
  );
}
