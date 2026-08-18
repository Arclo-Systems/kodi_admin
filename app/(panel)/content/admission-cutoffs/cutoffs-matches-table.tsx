'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CutoffMatchStatusBadge } from '@/lib/cutoff-status';
import {
  CUTOFF_DEGREES,
  CUTOFF_MODALITIES,
  useCutoffMatches,
  useSaveCutoffMatches,
  type CutoffCatalogCareer,
  type CutoffDegree,
  type CutoffMatch,
  type CutoffModality,
} from '@/hooks/use-cutoffs';
import {
  countPendingMatches,
  formatEmphases,
  isDraftDirty,
  isDraftSendable,
  matchKey,
  matchesToPatchItems,
  parseEmphases,
  toDraft,
  type MatchDraft,
  type MatchDrafts,
} from './cutoffs-matches-model';

const DEGREE_LABEL: Record<CutoffDegree, string> = {
  diplomado: 'Dipl',
  bachillerato: 'Bach',
  licenciatura: 'Lic',
};
const MODALITY_LABEL: Record<CutoffModality, string> = {
  diurna: 'Diurna',
  nocturna: 'Nocturna',
  virtual: 'Virtual',
};
// Radix no admite value vacío en un SelectItem: sentinel para "sin modalidad".
const NO_MODALITY = 'NONE';

function CatalogOption({
  name,
  score,
  selected,
  onPick,
}: {
  name: string;
  score?: number;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="hover:bg-accent flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
    >
      {selected ? (
        <CheckIcon className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <span className="truncate">{name}</span>
      {score !== undefined && (
        <span className="text-muted-foreground ml-auto tabular-nums">
          {Math.round(score * 100)}%
        </span>
      )}
    </button>
  );
}

function CareerCombobox({
  match,
  draft,
  catalog,
  disabled,
  onChange,
}: {
  match: CutoffMatch;
  draft: MatchDraft;
  catalog: CutoffCatalogCareer[];
  disabled: boolean;
  onChange: (patch: Partial<MatchDraft>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = (name: string) => !q || name.toLowerCase().includes(q);
  const candidateIds = new Set(match.candidates.map((c) => c.id));
  const suggestions = match.candidates.filter((c) => matches(c.name));
  const rest = catalog.filter((c) => !candidateIds.has(c.id) && matches(c.name));

  const selected = catalog.find((c) => c.id === draft.careerProfileId);
  const newName = draft.career.trim();
  const label = draft.createCareer
    ? `Crear «${draft.createCareer.name}»`
    : (selected?.name ?? 'Elegir carrera');

  function pick(id: string): void {
    onChange({ careerProfileId: id, createCareer: null });
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            // role=combobox no toma el nombre del contenido: sin esto queda sin nombre accesible.
            aria-label={`Carrera del catálogo para ${match.officialName}`}
            disabled={disabled}
            className="w-64 justify-between font-normal"
          >
            <span className="truncate">{label}</span>
            <ChevronsUpDownIcon className="size-3 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 gap-0 p-0" align="start">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="text-muted-foreground size-3.5" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el catálogo…"
              aria-label="Buscar carrera del catálogo"
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {suggestions.length > 0 && (
              <p className="text-muted-foreground px-3 py-1 text-xs font-medium">Sugerencias</p>
            )}
            {suggestions.map((c) => (
              <CatalogOption
                key={c.id}
                name={c.name}
                score={c.score}
                selected={draft.careerProfileId === c.id}
                onPick={() => pick(c.id)}
              />
            ))}
            {rest.length > 0 && suggestions.length > 0 && (
              <p className="text-muted-foreground px-3 py-1 text-xs font-medium">Catálogo</p>
            )}
            {rest.map((c) => (
              <CatalogOption
                key={c.id}
                name={c.name}
                selected={draft.careerProfileId === c.id}
                onPick={() => pick(c.id)}
              />
            ))}
            {suggestions.length === 0 && rest.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-sm">Sin resultados</p>
            )}
          </div>
          {newName.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChange({ createCareer: { name: newName }, careerProfileId: null });
                setOpen(false);
                setQuery('');
              }}
              className="hover:bg-accent flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm"
            >
              <PlusIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Crear «{newName}» como carrera nueva</span>
            </button>
          )}
        </PopoverContent>
      </Popover>

      {draft.createCareer && (
        <Input
          value={draft.createCareer.area ?? ''}
          onChange={(e) =>
            onChange({
              createCareer: {
                name: draft.createCareer?.name ?? newName,
                ...(e.target.value ? { area: e.target.value } : {}),
              },
            })
          }
          disabled={disabled}
          placeholder="Área (opcional)"
          aria-label={`Área de la carrera nueva de ${match.officialName}`}
          className="h-8 w-64"
        />
      )}
    </div>
  );
}

function MatchRow({
  match,
  draft,
  catalog,
  disabled,
  onChange,
}: {
  match: CutoffMatch;
  draft: MatchDraft;
  catalog: CutoffCatalogCareer[];
  disabled: boolean;
  onChange: (patch: Partial<MatchDraft>) => void;
}) {
  const dirty = isDraftDirty(match, draft);

  function toggleDegree(degree: CutoffDegree, checked: boolean): void {
    const next = checked
      ? CUTOFF_DEGREES.filter((d) => d === degree || draft.degrees.includes(d))
      : draft.degrees.filter((d) => d !== degree);
    onChange({ degrees: [...next] });
  }

  const rowId = matchKey(match.university, match.officialName);

  return (
    <TableRow className={dirty ? 'bg-primary/5' : undefined}>
      <TableCell className="align-top">
        <p className="font-mono text-xs">{match.officialName}</p>
        <p className="text-muted-foreground text-xs">
          {match.university}
          {match.sourceCode && ` · ${match.sourceCode}`}
        </p>
      </TableCell>
      <TableCell className="align-top">
        <Input
          value={draft.career}
          // La carrera a crear se llama como el nombre limpio: si se reescribe, sigue al día.
          onChange={(e) =>
            onChange({
              career: e.target.value,
              ...(draft.createCareer
                ? { createCareer: { ...draft.createCareer, name: e.target.value } }
                : {}),
            })
          }
          disabled={disabled}
          aria-label={`Nombre limpio de ${match.officialName}`}
          className="h-8 w-64"
        />
      </TableCell>
      <TableCell className="align-top">
        <div className="flex gap-3">
          {CUTOFF_DEGREES.map((d) => (
            <div key={d} className="flex items-center gap-1.5">
              <Checkbox
                id={`${rowId}-${d}`}
                checked={draft.degrees.includes(d)}
                disabled={disabled}
                onCheckedChange={(checked) => toggleDegree(d, checked === true)}
              />
              <Label htmlFor={`${rowId}-${d}`} className="text-xs font-normal">
                {DEGREE_LABEL[d]}
              </Label>
            </div>
          ))}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Input
          value={formatEmphases(draft.emphases)}
          onChange={(e) => onChange({ emphases: parseEmphases(e.target.value) })}
          disabled={disabled}
          placeholder="Sin énfasis"
          aria-label={`Énfasis de ${match.officialName}`}
          className="h-8 w-44"
        />
      </TableCell>
      <TableCell className="align-top">
        <Select
          value={draft.modality ?? NO_MODALITY}
          disabled={disabled}
          onValueChange={(v) =>
            onChange({ modality: v === NO_MODALITY ? null : (v as CutoffModality) })
          }
        >
          <SelectTrigger size="sm" className="w-32" aria-label={`Modalidad de ${match.officialName}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_MODALITY}>—</SelectItem>
            {CUTOFF_MODALITIES.map((m) => (
              <SelectItem key={m} value={m}>
                {MODALITY_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="align-top">
        <CareerCombobox
          match={match}
          draft={draft}
          catalog={catalog}
          disabled={disabled}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="align-top">
        <CutoffMatchStatusBadge status={match.status} />
      </TableCell>
      <TableCell className="text-muted-foreground align-top text-right tabular-nums">
        {match.rowCount}
      </TableCell>
    </TableRow>
  );
}

export function CutoffsMatchesTable({ id, canEdit }: { id: string; canEdit: boolean }) {
  const { data, isLoading, isError } = useCutoffMatches(id);
  const save = useSaveCutoffMatches(id);
  const [edits, setEdits] = useState<MatchDrafts>({});
  const [onlyPending, setOnlyPending] = useState(false);

  const matches = data?.matches ?? [];
  const catalog = data?.catalog ?? [];
  const pending = countPendingMatches(matches);

  const draftFor = (m: CutoffMatch): MatchDraft =>
    edits[matchKey(m.university, m.officialName)] ?? toDraft(m);

  const items = matchesToPatchItems(matches, edits);
  const editedWithoutCareer = matches.filter((m) => {
    const draft = draftFor(m);
    return isDraftDirty(m, draft) && !isDraftSendable(draft);
  }).length;

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <p className="text-destructive text-sm">No se pudo cargar el emparejador.</p>;
  if (matches.length === 0) return null;

  const visible = onlyPending ? matches.filter((m) => !m.decided) : matches;

  function change(m: CutoffMatch, patch: Partial<MatchDraft>): void {
    const key = matchKey(m.university, m.officialName);
    setEdits((prev) => ({ ...prev, [key]: { ...(prev[key] ?? toDraft(m)), ...patch } }));
  }

  async function submit(): Promise<void> {
    try {
      const result = await save.mutateAsync(items);
      setEdits({});
      toast.success(
        `${items.length} ${items.length === 1 ? 'emparejamiento guardado' : 'emparejamientos guardados'}`,
        {
          description:
            result.pending > 0
              ? `Faltan ${result.pending} carreras por emparejar.`
              : 'No quedan carreras por emparejar.',
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron guardar los emparejamientos');
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-medium">Emparejar carreras ({matches.length})</h3>
        <span className={pending > 0 ? 'text-warning text-sm' : 'text-muted-foreground text-sm'}>
          {pending === 1 ? '1 pendiente' : `${pending} pendientes`}
        </span>
        <div className="flex items-center gap-2">
          <Switch id="only-pending" checked={onlyPending} onCheckedChange={setOnlyPending} />
          <Label htmlFor="only-pending" className="text-muted-foreground text-sm font-normal">
            Solo pendientes
          </Label>
        </div>
        {canEdit && (
          <Button
            size="sm"
            className="ml-auto"
            disabled={items.length === 0 || save.isPending}
            onClick={submit}
          >
            {save.isPending ? 'Guardando…' : `Guardar emparejamientos (${items.length})`}
          </Button>
        )}
      </div>

      {editedWithoutCareer > 0 && (
        <p className="text-muted-foreground text-sm">
          {editedWithoutCareer} {editedWithoutCareer === 1 ? 'fila editada' : 'filas editadas'} sin
          carrera elegida: no se guardan hasta elegir una del catálogo o crearla.
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre oficial</TableHead>
              <TableHead>Nombre limpio</TableHead>
              <TableHead>Grado(s)</TableHead>
              <TableHead>
                Énfasis <span className="text-muted-foreground font-normal">(separá con |)</span>
              </TableHead>
              <TableHead>Modalidad</TableHead>
              <TableHead>Carrera del catálogo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Filas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-6 text-center">
                  No quedan carreras por emparejar.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((m) => (
                <MatchRow
                  key={matchKey(m.university, m.officialName)}
                  match={m}
                  draft={draftFor(m)}
                  catalog={catalog}
                  disabled={!canEdit || save.isPending}
                  onChange={(patch) => change(m, patch)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
