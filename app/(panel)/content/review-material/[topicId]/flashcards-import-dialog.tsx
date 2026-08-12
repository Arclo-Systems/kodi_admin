'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, UploadIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFlashcardImport, type FlashcardImportPreview } from '@/hooks/use-review-material';

const TEMPLATE_HEADER = 'front,back,order';
const TEMPLATE_EXAMPLE = '¿Cuánto es $2^3$?,8,1';

/**
 * Subida masiva de tarjetas por CSV (espejo del import de preguntas). Acá la
 * revisión vive en el mismo diálogo y no en una página aparte: el archivo es de
 * UN tema, tope 200 filas, así que la tabla entra sin paginar.
 */
export function FlashcardsImportDialog({ topicId }: { topicId: string }) {
  const { preview, confirm } = useFlashcardImport(topicId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<FlashcardImportPreview | null>(null);

  function reset(): void {
    setCsv('');
    setFileName('');
    setResult(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setCsv(text);
    setResult(null);
    try {
      setResult(await preview.mutateAsync(text));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo leer el archivo');
    }
  }

  async function submit(): Promise<void> {
    try {
      const imported = await confirm.mutateAsync({ csv });
      toast.success(`${imported.inserted} tarjetas agregadas como borrador`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron importar las tarjetas');
    }
  }

  function downloadTemplate(): void {
    // BOM para que Excel en español detecte UTF-8 y no rompa acentos/ñ.
    const blob = new Blob([`﻿${TEMPLATE_HEADER}\n${TEMPLATE_EXAMPLE}\n`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-tarjetas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UploadIcon className="size-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      {/* El prefijo `sm:` es obligatorio: DialogContent trae `sm:max-w-sm` y un
          `max-w-*` pelado no lo pisa — el diálogo quedaba angosto y el footer
          se salía de la tarjeta. */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar tarjetas (CSV)</DialogTitle>
          <DialogDescription>
            Las tarjetas se agregan al final del mazo y quedan como borrador.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <Field>
            <FieldLabel>Archivo CSV</FieldLabel>
            <div className="flex min-w-0 items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="hidden"
                tabIndex={-1}
                aria-hidden
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                aria-label="Seleccionar archivo CSV"
                onClick={() => fileRef.current?.click()}
              >
                <UploadIcon className="size-4" />
                Seleccionar archivo
              </Button>
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                {fileName || 'Sin archivo seleccionado'}
              </span>
            </div>
            <FieldDescription>
              Columnas: <code className="text-xs">front</code> (frente),{' '}
              <code className="text-xs">back</code> (dorso) y{' '}
              <code className="text-xs">order</code> (opcional, ordena el lote entre sí). Máximo
              200 filas y 40 000 caracteres por cara. Podés usar Markdown y LaTeX (
              <code className="text-xs">$…$</code>).
            </FieldDescription>
          </Field>

          {preview.isPending && (
            <p className="text-muted-foreground text-sm">Revisando el archivo…</p>
          )}

          {result && (
            <div className="space-y-3">
              <p className="text-sm">
                {result.validCount} de {result.total} filas se pueden importar.
              </p>
              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <ul className="list-inside list-disc">
                      {result.errors.map((e) => (
                        <li key={e.row}>
                          Fila {e.row}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Frente</TableHead>
                      <TableHead>Dorso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row) => (
                      <TableRow key={row.row} className={row.valid ? undefined : 'opacity-60'}>
                        <TableCell>{row.row}</TableCell>
                        <TableCell className="max-w-64 truncate">{row.front}</TableCell>
                        <TableCell className="max-w-64 truncate">{row.back}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:flex-wrap sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <DownloadIcon className="size-4" />
            Descargar plantilla
          </Button>
          <Button
            onClick={submit}
            disabled={!result || result.validCount === 0 || confirm.isPending}
          >
            <UploadIcon className="size-4" />
            {confirm.isPending ? 'Importando…' : 'Importar tarjetas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
