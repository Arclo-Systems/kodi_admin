'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DownloadIcon, FileTextIcon, UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { COUNTRIES } from '@/lib/countries';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { useCutoffMutations } from '@/hooks/use-cutoffs';

export function CutoffsUploadDialog() {
  const router = useRouter();
  const { upload } = useCutoffMutations();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<string>(COUNTRIES[0]?.code ?? 'CR');
  const [moduleId, setModuleId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: tree } = useModulesTree(country);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (file) {
      setCsv(await file.text());
      setFileName(file.name);
    }
  }

  function downloadTemplate(): void {
    const header = 'university,faculty,career,campus,cutoffScore';
    // Ejemplos: uno con sede, otro con campus vacío (permitido). Punto decimal y coma como separador.
    const examples = [
      'UCR,110103,BACHILLERATO Y LICENCIATURA EN ARTES TEATRALES,RODRIGO FACIO,526.59',
      'UNA,,ENSEÑANZA DEL INGLÉS,,452.10',
    ];
    // BOM para que Excel en español detecte UTF-8 y no rompa acentos/ñ.
    const content = `﻿${header}\n${examples.join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-cortes-admision.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function run(): void {
    if (!moduleId || !csv) {
      toast.error('Elegí módulo y archivo');
      return;
    }
    upload.mutate(
      { moduleId, country, year, csv },
      {
        onSuccess: (created) => {
          toast.success('Subida creada — revisá el diff');
          setOpen(false);
          setCsv('');
          setFileName('');
          if (created?.id) router.push(`/content/admission-cutoffs/${created.id}`);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UploadIcon className="size-4" />
          Subir CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir cortes de admisión</DialogTitle>
          <DialogDescription>Reemplaza los cortes del módulo y año (previa validación).</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>País</FieldLabel>
              <Select
                value={country}
                onValueChange={(v) => {
                  setCountry(v);
                  setModuleId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} · {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="cutoff-year">Año</FieldLabel>
              <Input
                id="cutoff-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || year)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Módulo</FieldLabel>
            <Select value={moduleId || undefined} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                {(tree ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
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
            <FieldDescription>
              Columnas (en este orden):{' '}
              <code className="text-xs">university, faculty, career, campus, cutoffScore</code>.{' '}
              <code className="text-xs">campus</code> puede ir vacío. Si las notas usan coma decimal
              (ej. <code className="text-xs">542,15</code>), guardá el archivo separado por{' '}
              <code className="text-xs">;</code> (punto y coma) — es como lo exporta Excel en español.
            </FieldDescription>
          </Field>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <DownloadIcon className="size-4" />
            Descargar plantilla
          </Button>
          <Button onClick={run} disabled={upload.isPending}>
            <UploadIcon className="size-4" />
            {upload.isPending ? 'Subiendo…' : 'Subir y revisar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
