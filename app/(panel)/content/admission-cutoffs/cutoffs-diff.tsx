'use client';

import { AlertTriangleIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CutoffDetail, CutoffRow, InvalidRow } from '@/hooks/use-cutoffs';

function RowsTable({ rows }: { rows: CutoffRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Universidad</TableHead>
            <TableHead>Facultad</TableHead>
            <TableHead>Carrera</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead className="text-right">Corte</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-6 text-center">
                Sin filas
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r, i) => (
              <TableRow key={`${r.university}-${r.career}-${i}`}>
                <TableCell>{r.university}</TableCell>
                <TableCell>{r.faculty}</TableCell>
                <TableCell>{r.career}</TableCell>
                <TableCell>{r.campus ?? '—'}</TableCell>
                <TableCell className="text-right">{r.cutoffScore}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function InvalidTable({ rows }: { rows: InvalidRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Universidad</TableHead>
            <TableHead>Carrera</TableHead>
            <TableHead>Corte</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.university || '—'}</TableCell>
              <TableCell>{r.career || '—'}</TableCell>
              <TableCell>{r.cutoffScore || '—'}</TableCell>
              <TableCell className="text-destructive">{r.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CutoffsDiff({ upload }: { upload: CutoffDetail }) {
  const invalidRows = upload.diffSummary.invalidRows ?? [];
  const currentCutoffs = upload.currentCutoffs ?? [];
  const hiddenInvalid = upload.diffSummary.invalid - invalidRows.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-success/40 bg-success/15 text-success gap-1">
          <PlusIcon className="size-3" aria-hidden />
          {upload.diffSummary.toInsert} a insertar
        </Badge>
        <Badge variant="outline" className="border-destructive/40 bg-destructive/15 text-destructive gap-1">
          <MinusIcon className="size-3" aria-hidden />
          {upload.diffSummary.toDelete} a eliminar
        </Badge>
        {upload.diffSummary.invalid > 0 && (
          <Badge variant="outline" className="border-warning/40 bg-warning/15 text-warning gap-1">
            <AlertTriangleIcon className="size-3" aria-hidden />
            {upload.diffSummary.invalid} inválidas
          </Badge>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">A insertar ({upload.rowsToInsert.length})</h3>
        <RowsTable rows={upload.rowsToInsert} />
      </section>

      {invalidRows.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            Inválidas — no se insertan ({upload.diffSummary.invalid})
            {hiddenInvalid > 0 && (
              <span className="text-muted-foreground font-normal"> · se muestran las primeras {invalidRows.length}</span>
            )}
          </h3>
          <InvalidTable rows={invalidRows} />
        </section>
      )}

      {currentCutoffs.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            A eliminar — cortes actuales que se reemplazan al aprobar ({currentCutoffs.length})
          </h3>
          <RowsTable rows={currentCutoffs} />
        </section>
      )}
    </div>
  );
}
