import Image from 'next/image';
import { TrophyIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';
import { leagueMeta } from '@/lib/leagues';

// Ligas-v2: la lista es (moduleId, country, leagueLevel) — campos directos de la membership.
type LeagueMembership = {
  id: string;
  leagueLevel: string;
  country: string;
  xpThisCycle: number;
  finalRank: number | null;
  cycle: { isoYear: number; isoWeek: number };
};

export default async function LeaguesTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/leagues`);
  const items = unwrapData<LeagueMembership[]>(await res.json()) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrophyIcon className="text-warning size-4" />
          Historial de ligas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin participación en ligas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciclo</TableHead>
                <TableHead>Liga</TableHead>
                <TableHead>País</TableHead>
                <TableHead className="text-right">Rank</TableHead>
                <TableHead className="text-right">XP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((l) => {
                const meta = leagueMeta(l.leagueLevel);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="tabular-nums">
                      {l.cycle.isoYear}-W{l.cycle.isoWeek}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1"
                        style={{ backgroundColor: `${meta.color}1A` }}
                      >
                        {meta.asset && (
                          <Image
                            src={meta.asset}
                            alt={`Liga ${meta.label}`}
                            width={24}
                            height={24}
                            unoptimized
                          />
                        )}
                        <span className="text-sm font-medium">{meta.label}</span>
                      </span>
                    </TableCell>
                    <TableCell>{l.country}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.finalRank ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.xpThisCycle.toLocaleString('es')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
