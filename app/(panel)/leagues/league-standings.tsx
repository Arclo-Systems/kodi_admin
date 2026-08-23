'use client';

import { useState } from 'react';
import { EyeOffIcon, TrophyIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow } from '@/components/admin/empty-state';
import { COUNTRIES } from '@/lib/countries';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { LEAGUE_TIERS, type LeagueTier } from '@/hooks/use-league-config';
import {
  useLeagueStandings,
  type LeagueOutcome,
  type LeagueStandingRow,
} from '@/hooks/use-league-standings';

const TIER_LABEL: Record<LeagueTier, string> = {
  aprendiz: 'Aprendiz',
  avanzado: 'Avanzado',
  experto: 'Experto',
  genio: 'Genio',
};

const OUTCOME_LABEL: Record<LeagueOutcome, string> = {
  promoted: 'Ascendió',
  stayed: 'Se quedó',
  demoted: 'Descendió',
};

const COLUMNS = 5;
const SKELETON_ROWS = 8;

export type StandingsTableProps = {
  /** false = todavía falta elegir la tabla que se quiere mirar. */
  ready: boolean;
  isLoading: boolean;
  error: Error | null;
  items: LeagueStandingRow[];
  onRetry: () => void;
};

/** La lista en sí: solo lectura, sin acciones (el panel no edita membresías). */
export function StandingsTable(props: StandingsTableProps) {
  if (props.error) {
    return (
      <Card className="max-w-lg space-y-3 p-6 text-center">
        <p className="text-sm font-medium">No se pudo cargar la tabla</p>
        <p className="text-muted-foreground text-sm">
          {props.error.message || 'Intentá de nuevo en un momento.'}
        </p>
        <Button variant="outline" size="sm" onClick={props.onRetry}>
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-16">
              #
            </TableHead>
            <TableHead scope="col">Jugador</TableHead>
            <TableHead scope="col">EXP del ciclo</TableHead>
            <TableHead scope="col">Primera semana</TableHead>
            <TableHead scope="col">Desenlace</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!props.ready ? (
            <TableEmptyRow
              colSpan={COLUMNS}
              icon={<TrophyIcon />}
              message="Elegí un módulo"
              description="Cada módulo, país y liga tiene su propia tabla dentro del ciclo de la semana."
            />
          ) : props.isLoading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: COLUMNS }).map((_c, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : props.items.length === 0 ? (
            <TableEmptyRow
              colSpan={COLUMNS}
              icon={<TrophyIcon />}
              message="Todavía nadie compite en esta liga"
              description="Aparecerán en cuanto alguien gane EXP en este módulo esta semana."
            />
          ) : (
            props.items.map((row) => (
              <TableRow key={row.userId} className="hover:bg-transparent">
                <TableCell className="text-muted-foreground tabular-nums">{row.position}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{row.displayName}</span>
                    {!row.showInRankings && (
                      <Badge variant="outline" className="gap-1">
                        <EyeOffIcon className="size-3" />
                        Oculto al público
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{row.xpThisCycle}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.isFirstCycle ? 'Sí' : '—'}
                </TableCell>
                {/* El desenlace se escribe al cerrar el ciclo: durante la
                    semana la columna va vacía a propósito. */}
                <TableCell className="text-muted-foreground">
                  {row.outcome ? OUTCOME_LABEL[row.outcome] : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Tabla del ciclo vigente de una liga: solo lectura. No hay acciones porque el
 * panel no edita membresías (el ascenso/descenso lo decide el cierre semanal).
 *
 * Los filtros no son cosmética: cada módulo + país + liga es una lista distinta
 * en la app, así que hay que elegir cuál se está mirando.
 */
export function LeagueStandings({ allowedCountries }: { allowedCountries: string[] }) {
  const countries = COUNTRIES.filter((c) => allowedCountries.includes(c.code));
  const [country, setCountry] = useState(countries[0]?.code ?? '');
  const [leagueLevel, setLeagueLevel] = useState<LeagueTier>('aprendiz');
  const [moduleId, setModuleId] = useState('');

  const { data: tree } = useModulesTree(country);
  const modules = tree ?? [];
  const ready = moduleId !== '';

  const { data, isLoading, error, refetch } = useLeagueStandings(
    { moduleId, country, leagueLevel },
    ready,
  );

  function pickCountry(value: string): void {
    setCountry(value);
    setModuleId('');
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={country} onValueChange={pickCountry}>
          <SelectTrigger className="w-44" size="sm" aria-label="País">
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} · {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={moduleId} onValueChange={setModuleId}>
          <SelectTrigger className="w-56" size="sm" aria-label="Módulo">
            <SelectValue placeholder="Elegí un módulo" />
          </SelectTrigger>
          <SelectContent>
            {modules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.shortName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={leagueLevel} onValueChange={(v) => setLeagueLevel(v as LeagueTier)}>
          <SelectTrigger className="w-44" size="sm" aria-label="Liga">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAGUE_TIERS.map((tier) => (
              <SelectItem key={tier} value={tier}>
                {TIER_LABEL[tier]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {ready && data && (
          <span className="text-muted-foreground text-sm">
            {data.totalPlayers} {data.totalPlayers === 1 ? 'jugador' : 'jugadores'}
            {data.cycle
              ? ` · semana ${data.cycle.isoWeek} de ${data.cycle.isoYear}`
              : ' · sin ciclo abierto'}
          </span>
        )}
      </div>

      <StandingsTable
        ready={ready}
        isLoading={isLoading}
        error={error}
        items={data?.items ?? []}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
