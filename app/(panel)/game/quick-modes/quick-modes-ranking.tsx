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
import { useModeRanking, type ModeRankingRow, type QuickMode } from '@/hooks/use-mode-ranking';

const MODES: { value: QuickMode; label: string }[] = [
  { value: 'contrarreloj', label: 'Contrarreloj' },
  { value: 'supervivencia', label: 'Supervivencia' },
];

const COLUMNS = 5;
const SKELETON_ROWS = 8;

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

export type RankingTableProps = {
  /** false = todavía falta elegir la tabla que se quiere mirar. */
  ready: boolean;
  needsExam: boolean;
  isLoading: boolean;
  error: Error | null;
  items: ModeRankingRow[];
  onRetry: () => void;
};

/** Los récords en sí: solo lectura, sin acciones ni paginación (es un top). */
export function RankingTable(props: RankingTableProps) {
  if (props.error) {
    return (
      <Card className="max-w-lg space-y-3 p-6 text-center">
        <p className="text-sm font-medium">No se pudo cargar el ranking</p>
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
            <TableHead scope="col">Puntaje</TableHead>
            <TableHead scope="col">Mejor combo</TableHead>
            <TableHead scope="col">Récord</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!props.ready ? (
            <TableEmptyRow
              colSpan={COLUMNS}
              icon={<TrophyIcon />}
              message={props.needsExam ? 'Elegí el examen' : 'Elegí un módulo'}
              description="Cada modo, módulo, país y examen tiene su propia tabla de récords."
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
              message="Todavía nadie marcó un récord acá"
              description="Aparecerán en cuanto alguien juegue este modo en este módulo."
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
                <TableCell className="tabular-nums">{row.bestScore}</TableCell>
                <TableCell className="tabular-nums">{row.bestCombo}</TableCell>
                <TableCell>{fmt(row.updatedAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Ranking histórico de los modos rápidos: solo lectura. No se reinicia (son
 * récords y así se quedan), por eso no hay acciones ni filtro de período.
 *
 * Los filtros no son cosmética: cada modo + módulo + país + examen es una tabla
 * distinta en la app, así que hay que elegir cuál se está mirando.
 */
export function QuickModesRanking({ allowedCountries }: { allowedCountries: string[] }) {
  const countries = COUNTRIES.filter((c) => allowedCountries.includes(c.code));
  const [mode, setMode] = useState<QuickMode>('contrarreloj');
  const [country, setCountry] = useState(countries[0]?.code ?? '');
  const [moduleId, setModuleId] = useState('');
  const [examSubjectId, setExamSubjectId] = useState('');

  const { data: tree } = useModulesTree(country);
  const modules = tree ?? [];
  const selectedModule = modules.find((m) => m.id === moduleId);

  // En admisión la materia ES el examen (PAA UCR, TEC) y cada uno tiene su
  // propia tabla: sin elegirlo no hay ranking que mostrar.
  const needsExam = selectedModule?.examMode === 'admission';
  const examOptions = needsExam ? (selectedModule?.subjects ?? []) : [];
  const ready = moduleId !== '' && (!needsExam || examSubjectId !== '');

  const { data, isLoading, error, refetch } = useModeRanking(
    mode,
    { moduleId, country, examSubjectId: needsExam ? examSubjectId : null },
    ready,
  );

  function pickCountry(value: string): void {
    setCountry(value);
    setModuleId('');
    setExamSubjectId('');
  }

  function pickModule(value: string): void {
    setModuleId(value);
    setExamSubjectId('');
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={mode} onValueChange={(v) => setMode(v as QuickMode)}>
          <SelectTrigger className="w-44" size="sm" aria-label="Modo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Select value={moduleId} onValueChange={pickModule}>
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

        {needsExam && (
          <Select value={examSubjectId} onValueChange={setExamSubjectId}>
            <SelectTrigger className="w-56" size="sm" aria-label="Examen">
              <SelectValue placeholder="Elegí el examen" />
            </SelectTrigger>
            <SelectContent>
              {examOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {ready && data && (
          <span className="text-muted-foreground text-sm">
            {data.totalPlayers} {data.totalPlayers === 1 ? 'jugador' : 'jugadores'} · top{' '}
            {data.items.length}
          </span>
        )}
      </div>

      <RankingTable
        ready={ready}
        needsExam={Boolean(needsExam)}
        isLoading={isLoading}
        error={error}
        items={data?.items ?? []}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
