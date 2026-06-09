import { requireAction } from '@/lib/guard';
import { MatchesList } from '../matches-list';

export const metadata = { title: 'Partidas' };

export default async function MatchesPage() {
  await requireAction('view:game');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Partidas</h1>
        <p className="text-muted-foreground">
          Partida Kodi 1v1 (aleatoria y privada): inspección y anulación.
        </p>
      </div>
      <MatchesList />
    </div>
  );
}
