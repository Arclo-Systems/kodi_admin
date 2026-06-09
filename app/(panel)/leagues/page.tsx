import { requireAction } from '@/lib/guard';
import { LeagueConfigForm } from './league-config-form';

export const metadata = { title: 'Ligas' };

export default async function LeaguesPage() {
  await requireAction('leagues:config:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ligas — Configuración</h1>
        <p className="text-muted-foreground">
          Fracción y tope de ascenso/descenso + premio por puesto, por tier y país. Aprendiz no
          desciende (piso); Genio no asciende (techo).
        </p>
      </div>
      <LeagueConfigForm />
    </div>
  );
}
