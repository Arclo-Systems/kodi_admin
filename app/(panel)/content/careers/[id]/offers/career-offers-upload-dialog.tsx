'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, FileTextIcon, UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCareerOffersUpload,
  type CareerOfferUploadResult,
} from '@/hooks/use-career-offers';

const COLUMNS =
  'careerName,universityCode,campuses,modality,durationText,scheduleText,costText,note,url';

// El CSV es por país (no por carrera): la columna careerName decide a cuál va cada fila.
export function CareerOffersUploadDialog({ country }: { country?: string }) {
  const upload = useCareerOffersUpload();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<CareerOfferUploadResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (file) {
      setCsv(await file.text());
      setFileName(file.name);
    }
  }

  function downloadTemplate(): void {
    const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [
      [
        'Derecho',
        'ULAT',
        'San José|Heredia',
        'presencial',
        '4 años',
        'Nocturno',
        '₡180.000 por cuatrimestre',
        'Beca por promedio',
        'https://ulatina.cr/derecho?utm_source=kodi',
      ],
      ['Psicología', 'UFIDE', 'San José', 'mixta', '4 años', '', '', '', 'https://ufide.ac.cr/psicologia'],
    ];
    // BOM para que Excel en español detecte UTF-8 (acentos/ñ).
    const content = `﻿${COLUMNS}\n${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-ofertas-privadas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function run(): void {
    if (!country) {
      toast.error('Todavía no se cargó el país de la carrera');
      return;
    }
    if (!csv.trim()) {
      toast.error('Pegá el CSV o elegí un archivo');
      return;
    }
    upload.mutate(
      { country, csv },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`${data.created} creadas · ${data.updated} actualizadas`);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCsv('');
          setFileName('');
          setResult(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!country}>
          <UploadIcon className="size-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar ofertas (CSV)</DialogTitle>
          <DialogDescription>
            Upsert por (carrera, universidad) en {country ?? '—'}. Se aplica de una: no hay paso de
            revisión porque no toca notas ni cortes.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          <Field>
            <FieldLabel>Archivo CSV</FieldLabel>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFile}
              tabIndex={-1}
              aria-hidden
            />
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => fileRef.current?.click()}
              >
                <UploadIcon className="size-4" />
                Elegir archivo
              </Button>
              {fileName ? (
                <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 text-sm">
                  <FileTextIcon className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{fileName}</span>
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">Ningún archivo elegido</span>
              )}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="offers-csv">Contenido</FieldLabel>
            <Textarea
              id="offers-csv"
              rows={8}
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setFileName('');
              }}
              placeholder={COLUMNS}
              className="font-mono text-xs"
            />
            <FieldDescription className="space-y-1">
              <span className="block">Columnas:</span>
              <code className="block max-w-full break-all text-xs">{COLUMNS}</code>
              <span className="block">
                <code className="text-xs">campuses</code> separadas con «|».{' '}
                <code className="text-xs">modality</code>: presencial/virtual/mixta.{' '}
                <code className="text-xs">url</code> debe ser https. La universidad se busca por{' '}
                <code className="text-xs">code</code> y tiene que estar cargada como privada.
              </span>
            </FieldDescription>
          </Field>

          {result && (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm">
                <span className="font-medium">{result.created}</span> creadas ·{' '}
                <span className="font-medium">{result.updated}</span> actualizadas ·{' '}
                <span className="font-medium">{result.invalidRows.length}</span> con error
              </p>
              {result.invalidRows.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Carrera</TableHead>
                        <TableHead>Código U</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.invalidRows.map((row, i) => (
                        <TableRow key={`${row.careerName}-${row.universityCode}-${i}`}>
                          <TableCell>{row.careerName || '—'}</TableCell>
                          <TableCell>{row.universityCode || '—'}</TableCell>
                          <TableCell className="text-destructive">{row.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <DownloadIcon className="size-4" />
            Descargar plantilla
          </Button>
          <Button onClick={run} disabled={upload.isPending}>
            <UploadIcon className="size-4" />
            {upload.isPending ? 'Importando…' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
