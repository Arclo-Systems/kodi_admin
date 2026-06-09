'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { FileTextIcon, LayersIcon, SaveIcon, TrendingUpIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import {
  DEMAND_LABELS,
  useCareer,
  useCareerMutations,
  type Career,
  type CareerInput,
  type DemandLevel,
} from '@/hooks/use-careers';
import { useModulesTree } from '@/hooks/use-modules-tree';

const NONE = '__none__';
const DEMANDS: DemandLevel[] = ['alta', 'media', 'baja', 'saturada'];

type FormValues = {
  moduleId: string;
  country: string;
  name: string;
  area: string;
  riasecCode: string;
  description: string;
  fieldOfWork: string;
  durationYears: string;
  employmentRate: string;
  avgSalaryMonthly: string;
  demandLevel: string;
  marketNote: string;
  olapYear: string;
  isActive: boolean;
};

const numStr = (n: number | null): string => (n == null ? '' : String(n));

function toValues(c: Career): FormValues {
  return {
    moduleId: c.moduleId,
    country: c.country,
    name: c.name,
    area: c.area ?? '',
    riasecCode: c.riasecCode,
    description: c.description ?? '',
    fieldOfWork: c.fieldOfWork ?? '',
    durationYears: numStr(c.durationYears),
    employmentRate: numStr(c.employmentRate),
    avgSalaryMonthly: numStr(c.avgSalaryMonthly),
    demandLevel: c.demandLevel ?? '',
    marketNote: c.marketNote ?? '',
    olapYear: numStr(c.olapYear),
    isActive: c.isActive,
  };
}

const toNum = (s: string): number | null => (s.trim() === '' ? null : Number(s));

function toInput(v: FormValues): CareerInput {
  return {
    moduleId: v.moduleId.trim(),
    country: v.country,
    name: v.name.trim(),
    area: v.area.trim() || null,
    riasecCode: v.riasecCode.trim().toUpperCase(),
    description: v.description.trim() || null,
    fieldOfWork: v.fieldOfWork.trim() || null,
    durationYears: toNum(v.durationYears),
    employmentRate: toNum(v.employmentRate),
    avgSalaryMonthly: toNum(v.avgSalaryMonthly),
    demandLevel: (v.demandLevel || null) as DemandLevel | null,
    marketNote: v.marketNote.trim() || null,
    olapYear: toNum(v.olapYear),
    isActive: v.isActive,
  };
}

export function CareerForm({ careerId }: { careerId?: string }) {
  const { data: detail, isLoading } = useCareer(careerId ?? '');
  if (careerId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) return <p className="text-muted-foreground text-sm">Carrera no encontrada.</p>;
    return <CareerFormInner careerId={careerId} initial={toValues(detail)} />;
  }
  return <CareerFormInner />;
}

function CareerFormInner({ careerId, initial }: { careerId?: string; initial?: FormValues }) {
  const router = useRouter();
  const { create, update } = useCareerMutations();
  const form = useForm<FormValues>({
    defaultValues:
      initial ?? {
        moduleId: '',
        country: 'CR',
        name: '',
        area: '',
        riasecCode: '',
        description: '',
        fieldOfWork: '',
        durationYears: '',
        employmentRate: '',
        avgSalaryMonthly: '',
        demandLevel: '',
        marketNote: '',
        olapYear: '',
        isActive: true,
      },
  });

  const selectedCountry = useWatch({ control: form.control, name: 'country' });
  const { data: modules } = useModulesTree(selectedCountry);

  async function submit(v: FormValues): Promise<void> {
    if (!v.moduleId) {
      toast.error('Elegí un módulo');
      return;
    }
    if (!/^[RIASEC]{1,3}$/.test(v.riasecCode.trim().toUpperCase())) {
      toast.error('Código RIASEC inválido (1-3 letras de R/I/A/S/E/C)');
      return;
    }
    try {
      if (careerId) {
        await update.mutateAsync({ id: careerId, input: toInput(v) });
        toast.success('Carrera actualizada');
      } else {
        await create.mutateAsync(toInput(v));
        toast.success('Carrera creada');
      }
      router.push('/content/careers');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando la carrera');
    }
  }

  const text = (name: keyof FormValues, label: string, desc?: string) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={`c-${name}`}>{label}</FieldLabel>
          <Input id={`c-${name}`} value={field.value as string} onChange={field.onChange} />
          {desc && <FieldDescription>{desc}</FieldDescription>}
        </Field>
      )}
    />
  );

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <fieldset className="min-w-0 space-y-3">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <LayersIcon className="text-primary size-4" />
              Clasificación
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue('moduleId', '');
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
                )}
              />
              <Controller
                name="moduleId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Módulo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí un módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {(modules ?? []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>El módulo PAA del país seleccionado.</FieldDescription>
                  </Field>
                )}
              />
              {text('riasecCode', 'Código RIASEC', 'Ej. ISA — 1 a 3 letras de R/I/A/S/E/C.')}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <FileTextIcon className="text-primary size-4" />
              Información
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {text('name', 'Nombre de la carrera', 'Debe coincidir con el nombre en los cortes.')}
              {text('area', 'Área', 'Ej. Salud, Ingeniería.')}
            </div>
            <Controller
              name="description"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="c-desc">Descripción (datos de interés)</FieldLabel>
                  <Textarea id="c-desc" rows={3} value={field.value} onChange={field.onChange} />
                </Field>
              )}
            />
            <Controller
              name="fieldOfWork"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="c-field">
                    Campo laboral (¿qué hace? ¿dónde trabaja?)
                  </FieldLabel>
                  <Textarea id="c-field" rows={3} value={field.value} onChange={field.onChange} />
                </Field>
              )}
            />
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <TrendingUpIcon className="text-primary size-4" />
              Mercado (OLaP)
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {text('durationYears', 'Duración (años)')}
              {text('employmentRate', 'Tasa de empleo (0–1)')}
              {text('avgSalaryMonthly', 'Salario promedio (mensual)')}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Controller
                name="demandLevel"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Demanda</FieldLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— sin dato —</SelectItem>
                        {DEMANDS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {DEMAND_LABELS[d]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              {text('olapYear', 'Año OLaP')}
              {text('marketNote', 'Nota de mercado')}
            </div>
          </fieldset>

          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="c-active">Estado</FieldLabel>
                <div className="flex items-center gap-2">
                  <Switch id="c-active" checked={field.value} onCheckedChange={field.onChange} />
                  <span className="text-sm">{field.value ? 'Activa' : 'Inactiva'}</span>
                </div>
              </Field>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/content/careers')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {careerId ? 'Guardar cambios' : 'Crear carrera'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
