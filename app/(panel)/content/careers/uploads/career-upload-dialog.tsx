'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { useCareerUploadMutations } from '@/hooks/use-career-uploads';

const COLUMNS =
  'name,area,riasecCode,description,fieldOfWork,durationYears,employmentRate,avgSalaryMonthly,demandLevel,marketNote,olapYear';

export function CareerUploadDialog() {
  const router = useRouter();
  const { upload } = useCareerUploadMutations();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<string>(COUNTRIES[0]?.code ?? 'CR');
  const [moduleId, setModuleId] = useState('');
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
    // Cada celda entre comillas (descripcion/campo pueden llevar comas) con escape de comillas.
    const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const example1 = [
      'Medicina', 'Salud', 'IRS', 'Estudia y trata la salud humana', 'Hospitales, clínicas, investigación',
      '6', '0.72', '1500000', 'alta', 'Alta demanda y empleabilidad', '2024',
    ];
    const example2 = ['Derecho', 'Ciencias Sociales', 'ESA', '', '', '5', '', '', 'media', '', '2024'];
    // BOM para que Excel en español detecte UTF-8 (acentos/ñ).
    const content =
      `﻿${COLUMNS}\n` +
      `${example1.map(cell).join(',')}\n` +
      `${example2.map(cell).join(',')}\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-carreras.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function run(): void {
    if (!moduleId || !csv) {
      toast.error('Elegí módulo y archivo');
      return;
    }
    upload.mutate(
      { moduleId, country, csv },
      {
        onSuccess: (created) => {
          toast.success('Subida creada — revisá el diff');
          setOpen(false);
          setCsv('');
          setFileName('');
          if (created?.id) router.push(`/content/careers/uploads/${created.id}`);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UploadIcon className="size-4" />
          Subir CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir carreras (CSV)</DialogTitle>
          <DialogDescription>
            Upsert por nombre del módulo y país (previa revisión del diff). Conserva el estado activo.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
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
            <FieldLabel>Módulo</FieldLabel>
            <Select value={moduleId} onValueChange={setModuleId}>
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
            <FieldDescription className="space-y-1">
              <span className="block">Columnas (en este orden):</span>
              <code className="block max-w-full break-all text-xs">{COLUMNS}</code>
              <span className="block">
                Requeridas: <code className="text-xs">name</code> y{' '}
                <code className="text-xs">riasecCode</code> (1-3 de R/I/A/S/E/C).{' '}
                <code className="text-xs">demandLevel</code>: alta/media/baja/saturada.{' '}
                <code className="text-xs">employmentRate</code> entre 0 y 1.
              </span>
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
