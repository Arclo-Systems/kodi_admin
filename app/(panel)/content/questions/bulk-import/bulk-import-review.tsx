'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/admin/data-table-pagination';
import { unwrapData } from '@/lib/bff';
import { stripSvgForList } from '@/lib/svg-optimize';
import type { Difficulty } from '@/hooks/use-questions';
import { QuestionDifficulty } from '@/lib/question-status';
import { QuestionPreview } from '../question-preview';
import { QUESTIONS_IMPORT_KEY } from '../questions-import-dialog';
import { augmentRowsWithSvg, buildQuestionsCsv, rowHasSvg, type CsvRow } from './svg-augment';

const TABLE_PAGE_SIZE = 50;
const MAX_ERRORS_SHOWN = 100;

type PreviewRow = CsvRow;
type PreviewResult = {
  total: number;
  validCount: number;
  errors: { row: number; message: string }[];
  rows: PreviewRow[];
};
type ImportData = { moduleId: string; csv: string; fileName: string };

export function BulkImportReview() {
  const router = useRouter();
  const qc = useQueryClient();
  const [data, setData] = useState<ImportData | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [cardIdx, setCardIdx] = useState(0);

  useEffect(() => {
    void (async () => {
      const raw = sessionStorage.getItem(QUESTIONS_IMPORT_KEY);
      if (!raw) {
        setMissing(true);
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(raw) as ImportData;
      setData(parsed);
      try {
        const res = await fetch('/api/admin/content/questions/bulk-import/preview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ moduleId: parsed.moduleId, csv: parsed.csv }),
        });
        if (res.ok) {
          const result = unwrapData<PreviewResult>(await res.json());
          if (result) {
            const rows = await augmentRowsWithSvg(result.rows);
            const augmented: PreviewResult = {
              ...result,
              rows,
              validCount: rows.filter((r) => r.valid).length,
              errors: rows.filter((r) => !r.valid).map((r) => ({ row: r.row, message: r.error! })),
            };
            setPreview(augmented);
            setSelected(new Set(rows.filter((r) => r.valid).map((r) => r.row)));
          }
        } else {
          toast.error('No se pudo previsualizar el archivo');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validRows = useMemo(() => preview?.rows.filter((r) => r.valid) ?? [], [preview]);
  const invalidRows = useMemo(() => preview?.rows.filter((r) => !r.valid) ?? [], [preview]);
  const [tablePage, setTablePage] = useState(1);
  const pagedValid = useMemo(
    () => validRows.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE),
    [validRows, tablePage],
  );

  function toggle(row: number): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }
  function toggleAll(): void {
    setSelected((prev) =>
      prev.size === validRows.length ? new Set() : new Set(validRows.map((r) => r.row)),
    );
  }

  async function confirmImport(): Promise<void> {
    if (!data || !preview || selected.size === 0) return;
    setBusy(true);
    const chosen = preview.rows.filter((r) => r.valid && selected.has(r.row));
    const anySvg = chosen.some(rowHasSvg);
    const body = anySvg
      ? {
          moduleId: data.moduleId,
          csv: buildQuestionsCsv(chosen),
          selectedRows: chosen.map((_, i) => i + 1),
        }
      : { moduleId: data.moduleId, csv: data.csv, selectedRows: Array.from(selected) };
    const res = await fetch('/api/admin/content/questions/bulk-import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { message?: string };
      toast.error(b.message ?? 'Error importando');
      return;
    }
    const result = unwrapData<{ inserted: number }>(await res.json());
    toast.success(`${result?.inserted ?? 0} preguntas importadas como borrador`);
    sessionStorage.removeItem(QUESTIONS_IMPORT_KEY);
    qc.invalidateQueries({ queryKey: ['questions'] });
    router.push('/content/questions');
  }

  if (missing) {
    return (
      <div className="space-y-3 rounded-lg border py-12 text-center">
        <p className="text-muted-foreground text-sm">
          No hay nada para revisar. Volvé a Preguntas e importá un CSV.
        </p>
        <Button variant="outline" onClick={() => router.push('/content/questions')}>
          <ArrowLeftIcon className="size-4" /> Volver a Preguntas
        </Button>
      </div>
    );
  }
  if (loading) return <Skeleton className="h-48 w-full" />;
  if (!preview) {
    return <p className="text-muted-foreground text-sm">No se pudo previsualizar el archivo.</p>;
  }

  const card = validRows[cardIdx];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <span className="truncate text-sm font-medium">{data?.fileName ?? 'Archivo'}</span>
        <Badge variant="outline">{preview.total} filas</Badge>
        <Badge variant="outline" className="border-success/40 bg-success/15 text-success">
          {preview.validCount} válidas
        </Badge>
        {invalidRows.length > 0 && (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/15 text-destructive">
            {invalidRows.length} con error
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/content/questions/bulk-import/ids?moduleId=${data?.moduleId ?? ''}`)}
        >
          Ver IDs
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/content/questions')}>
            <ArrowLeftIcon className="size-4" /> Cancelar
          </Button>
          <Button onClick={confirmImport} disabled={busy || selected.size === 0}>
            <CheckIcon className="size-4" />
            {busy ? 'Importando…' : `Importar (${selected.size})`}
          </Button>
        </div>
      </div>

      {validRows.length > 0 && (
        <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'cards')}>
          <TabsList>
            <TabsTrigger value="table">Tabla</TabsTrigger>
            <TabsTrigger value="cards">Vista de pregunta</TabsTrigger>
          </TabsList>

          {view === 'table' ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          selected.size === validRows.length
                            ? true
                            : selected.size === 0
                              ? false
                              : 'indeterminate'
                        }
                        onCheckedChange={toggleAll}
                        aria-label="Seleccionar todas"
                      />
                    </TableHead>
                    <TableHead>Enunciado</TableHead>
                    <TableHead>Correcta</TableHead>
                    <TableHead>Dificultad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedValid.map((r) => {
                    const correctOpt = r.options.find((o) => o.id === r.correct);
                    return (
                      <TableRow key={r.row}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(r.row)}
                            onCheckedChange={() => toggle(r.row)}
                            aria-label={`Incluir fila ${r.row}`}
                          />
                        </TableCell>
                        <TableCell className="max-w-md truncate">{stripSvgForList(r.text)}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {r.correct.toUpperCase()} ·{' '}
                          {correctOpt?.text ? correctOpt.text.replace(/\s+/g, ' ') : '—'}
                        </TableCell>
                        <TableCell>
                          <QuestionDifficulty difficulty={r.difficulty as Difficulty} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
              {validRows.length > TABLE_PAGE_SIZE && (
                <DataTablePagination
                  page={tablePage}
                  pageSize={TABLE_PAGE_SIZE}
                  total={validRows.length}
                  onPageChange={setTablePage}
                />
              )}
            </div>
          ) : (
            card && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={selected.has(card.row)}
                      onCheckedChange={() => toggle(card.row)}
                      aria-label="Incluir esta pregunta"
                    />
                    Incluir esta pregunta
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {cardIdx + 1} / {validRows.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Anterior"
                      disabled={cardIdx === 0}
                      onClick={() => setCardIdx((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Siguiente"
                      disabled={cardIdx >= validRows.length - 1}
                      onClick={() => setCardIdx((i) => Math.min(validRows.length - 1, i + 1))}
                    >
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                </div>
                <QuestionPreview
                  text={card.text}
                  options={card.options}
                  correctOptionId={card.correct}
                  showAnswer
                  explanation={card.explanation || undefined}
                />
              </div>
            )
          )}
        </Tabs>
      )}

      {invalidRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangleIcon className="text-destructive size-4" />
              Filas con error ({invalidRows.length}) — no se importan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Fila</TableHead>
                    <TableHead>Enunciado</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invalidRows.slice(0, MAX_ERRORS_SHOWN).map((r) => (
                    <TableRow key={r.row}>
                      <TableCell className="tabular-nums">{r.row}</TableCell>
                      <TableCell className="max-w-md truncate">{stripSvgForList(r.text) || '—'}</TableCell>
                      <TableCell className="text-destructive">{r.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {invalidRows.length > MAX_ERRORS_SHOWN && (
              <p className="text-muted-foreground mt-2 text-sm">
                y {invalidRows.length - MAX_ERRORS_SHOWN} más…
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
