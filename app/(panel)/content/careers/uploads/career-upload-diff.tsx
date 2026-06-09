'use client';

import { AlertTriangleIcon, PlusIcon, RefreshCwIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DEMAND_LABELS, type DemandLevel } from '@/hooks/use-careers';
import type { CareerInvalidRow, CareerRow, CareerUploadDetail } from '@/hooks/use-career-uploads';

const MAX_INVALID = 100;
const demand = (d: string | null) => (d ? (DEMAND_LABELS[d as DemandLevel] ?? d) : '—');
const rate = (r: number | null) => (r == null ? '—' : `${Math.round(r * 100)}%`);

function RowsTable({ rows }: { rows: CareerRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Carrera</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>RIASEC</TableHead>
            <TableHead>Demanda</TableHead>
            <TableHead className="text-right">Empleo</TableHead>
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
              <TableRow key={`${r.name}-${i}`}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.area ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.riasecCode}</Badge>
                </TableCell>
                <TableCell>{demand(r.demandLevel)}</TableCell>
                <TableCell className="text-right tabular-nums">{rate(r.employmentRate)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function CareerUploadDiff({ upload }: { upload: CareerUploadDetail }) {
  const invalidRows = upload.diffSummary.invalidRows ?? [];
  const hiddenInvalid = upload.diffSummary.invalid - invalidRows.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-success/40 bg-success/15 text-success gap-1">
          <PlusIcon className="size-3" aria-hidden />
          {upload.diffSummary.toInsert} a insertar
        </Badge>
        <Badge variant="outline" className="border-info/40 bg-info/15 text-info gap-1">
          <RefreshCwIcon className="size-3" aria-hidden />
          {upload.diffSummary.toUpdate} a actualizar
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

      <section className="space-y-2">
        <h3 className="text-sm font-medium">
          A actualizar ({upload.rowsToUpdate.length}) — coinciden por nombre; conservan su estado activo
        </h3>
        <RowsTable rows={upload.rowsToUpdate} />
      </section>

      {invalidRows.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            Inválidas — no se aplican ({upload.diffSummary.invalid})
            {hiddenInvalid > 0 && (
              <span className="text-muted-foreground font-normal"> · se muestran las primeras {invalidRows.length}</span>
            )}
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrera</TableHead>
                  <TableHead>RIASEC</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invalidRows.slice(0, MAX_INVALID).map((r: CareerInvalidRow, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.name || '—'}</TableCell>
                    <TableCell>{r.riasecCode || '—'}</TableCell>
                    <TableCell className="text-destructive">{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
