'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DownloadIcon, UploadIcon } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModulesTree } from '@/hooks/use-modules-tree';

// Clave de traspaso a la página de revisión (el backend de preguntas no persiste la subida
// como Cortes; se pasa módulo+csv por sessionStorage para navegar a /bulk-import).
export const QUESTIONS_IMPORT_KEY = 'questions-import-csv';

// Mismo patrón que Cortes de admisión: el modal solo recoge módulo + archivo y manda a
// revisar; la previsualización y la confirmación viven en la página de revisión.
export function QuestionsImportDialog() {
  const router = useRouter();
  const { data: tree } = useModulesTree();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState('');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
  }

  function submit(): void {
    if (!moduleId || !csv) {
      toast.error('Elegí un módulo y un archivo CSV');
      return;
    }
    sessionStorage.setItem(QUESTIONS_IMPORT_KEY, JSON.stringify({ moduleId, csv, fileName }));
    setOpen(false);
    router.push('/content/questions/bulk-import');
  }

  function downloadTemplate(): void {
    const header =
      'subjectId,topicId,text,optionA,optionB,optionC,optionD,correct,difficulty,explanation';
    // El ejemplo muestra LaTeX inline ($…$): en text/opciones/explicación se acepta Markdown + LaTeX.
    const example = 'SUBJECT_ID,TOPIC_ID,¿Cuánto es $2^3$?,6,8,9,12,B,medium,Porque $2^3 = 8$';
    // BOM para que Excel en español detecte UTF-8 y no rompa acentos/ñ.
    const content = `﻿${header}\n${example}\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-preguntas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UploadIcon className="size-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar preguntas (CSV)</DialogTitle>
          <DialogDescription>
            Elegí módulo y archivo; revisás el resultado antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <Field>
            <FieldLabel>Módulo destino</FieldLabel>
            <Select value={moduleId || undefined} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí el módulo" />
              </SelectTrigger>
              <SelectContent>
                {(tree ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.country} · {m.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

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
              Columnas:{' '}
              <code className="text-xs">
                subjectId, topicId, text, optionA, optionB, optionC, optionD, correct (A-D),
                difficulty (easy/medium/hard), explanation (opcional)
              </code>
              . Los IDs de materias y temas los encontrás en{' '}
              <strong>Ver IDs de materias y temas</strong>. Podés usar Markdown y LaTeX (
              <code className="text-xs">$…$</code>) en enunciado, opciones y explicación. Para una
              figura SVG, pegá <code className="text-xs">```svg … ```</code> dentro de la celda{' '}
              <strong>entre comillas dobles</strong> (escapando las internas como{' '}
              <code className="text-xs">&quot;&quot;</code>); se optimiza al importar y se descarta si supera
              30 KB.
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <DownloadIcon className="size-4" />
            Descargar plantilla
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/content/questions/bulk-import/ids${moduleId ? `?moduleId=${moduleId}` : ''}`,
              )
            }
          >
            Ver IDs de materias y temas
          </Button>
          <Button onClick={submit} disabled={!moduleId || !csv}>
            <UploadIcon className="size-4" />
            Subir y revisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
