'use client';

import { useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { GaugeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTemplates,
  useTemplateMutation,
  type BotTemplate,
} from '@/hooks/use-bots';

function TemplateCard({
  template,
  canWrite,
}: {
  template: BotTemplate;
  canWrite: boolean;
}) {
  const mutation = useTemplateMutation();
  const [form, setForm] = useState({
    accuracyMin: template.accuracyMin,
    accuracyMax: template.accuracyMax,
    responseTimeMsMin: template.responseTimeMsMin,
    responseTimeMsMax: template.responseTimeMsMax,
    turnDelayMinMinutes: template.turnDelayMinMinutes,
    turnDelayMaxMinutes: template.turnDelayMaxMinutes,
  });

  async function save(): Promise<void> {
    try {
      await mutation.mutateAsync({ id: template.id, body: form });
      toast.success(`Plantilla ${template.name} actualizada`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const num =
    (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [k]: Number(e.target.value) });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GaugeIcon className="text-primary size-4" />
          {template.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor={`${template.id}-amin`}>Accuracy mín</FieldLabel>
            <Input id={`${template.id}-amin`} type="number" step="0.01" min={0} max={1} value={form.accuracyMin} onChange={num('accuracyMin')} disabled={!canWrite} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${template.id}-amax`}>Accuracy máx</FieldLabel>
            <Input id={`${template.id}-amax`} type="number" step="0.01" min={0} max={1} value={form.accuracyMax} onChange={num('accuracyMax')} disabled={!canWrite} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${template.id}-rmin`}>Tiempo mín (ms)</FieldLabel>
            <Input id={`${template.id}-rmin`} type="number" min={0} value={form.responseTimeMsMin} onChange={num('responseTimeMsMin')} disabled={!canWrite} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${template.id}-rmax`}>Tiempo máx (ms)</FieldLabel>
            <Input id={`${template.id}-rmax`} type="number" min={0} value={form.responseTimeMsMax} onChange={num('responseTimeMsMax')} disabled={!canWrite} />
          </Field>
        </div>

        <div className="space-y-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            Espera antes de tomar el turno en Partida Kodi. Se sortea un valor
            distinto en cada turno, para que no se note un patrón. No aplica a
            la Arena, que es por rondas simultáneas.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor={`${template.id}-tdmin`}>Espera mín (min)</FieldLabel>
              <Input id={`${template.id}-tdmin`} type="number" min={0} max={1440} value={form.turnDelayMinMinutes} onChange={num('turnDelayMinMinutes')} disabled={!canWrite} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${template.id}-tdmax`}>Espera máx (min)</FieldLabel>
              <Input id={`${template.id}-tdmax`} type="number" min={0} max={1440} value={form.turnDelayMaxMinutes} onChange={num('turnDelayMaxMinutes')} disabled={!canWrite} />
            </Field>
          </div>
        </div>
        {canWrite && (
          <Button size="sm" onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function TemplatesTab({ canWrite }: { canWrite: boolean }) {
  const { data, isLoading, isError } = useTemplates();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError)
    return (
      <p className="text-destructive text-sm">
        No se pudieron cargar las plantillas.
      </p>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(data ?? []).map((t) => (
        <TemplateCard key={t.id} template={t} canWrite={canWrite} />
      ))}
    </div>
  );
}
