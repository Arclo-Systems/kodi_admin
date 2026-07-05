'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { LayersIcon, PercentIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
  useUniversity,
  useUniversityMutations,
  type University,
  type UniversityInput,
} from '@/hooks/use-universities';

type FormValues = {
  country: string;
  code: string;
  name: string;
  examWeight: string;
  presentationWeight: string;
  scaleMin: string;
  scaleMax: string;
  isActive: boolean;
};

function toValues(u: University): FormValues {
  return {
    country: u.country,
    code: u.code,
    name: u.name,
    examWeight: u.examWeight,
    presentationWeight: u.presentationWeight,
    scaleMin: String(u.scaleMin),
    scaleMax: String(u.scaleMax),
    isActive: u.isActive,
  };
}

function toInput(v: FormValues): UniversityInput {
  return {
    country: v.country,
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    examWeight: Number(v.examWeight),
    presentationWeight: Number(v.presentationWeight),
    scaleMin: Number(v.scaleMin),
    scaleMax: Number(v.scaleMax),
    isActive: v.isActive,
  };
}

export function UniversityForm({ universityId }: { universityId?: string }) {
  const { data: detail, isLoading } = useUniversity(universityId ?? '');
  if (universityId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) {
      return <p className="text-muted-foreground text-sm">Universidad no encontrada.</p>;
    }
    return <UniversityFormInner universityId={universityId} initial={toValues(detail)} />;
  }
  return <UniversityFormInner />;
}

function UniversityFormInner({
  universityId,
  initial,
}: {
  universityId?: string;
  initial?: FormValues;
}) {
  const router = useRouter();
  const { create, update } = useUniversityMutations();
  const form = useForm<FormValues>({
    defaultValues:
      initial ?? {
        country: 'CR',
        code: '',
        name: '',
        examWeight: '',
        presentationWeight: '',
        scaleMin: '',
        scaleMax: '',
        isActive: true,
      },
  });

  async function submit(v: FormValues): Promise<void> {
    const code = v.code.trim().toUpperCase();
    if (code.length < 2 || code.length > 20) {
      toast.error('El código debe tener entre 2 y 20 caracteres');
      return;
    }
    if (!v.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    const exam = Number(v.examWeight);
    const presentation = Number(v.presentationWeight);
    if (Number.isNaN(exam) || exam < 0 || exam > 1) {
      toast.error('El peso del examen debe estar entre 0 y 1');
      return;
    }
    if (Number.isNaN(presentation) || presentation < 0 || presentation > 1) {
      toast.error('El peso de la presentación debe estar entre 0 y 1');
      return;
    }
    if (Math.abs(exam + presentation - 1) > 1e-6) {
      toast.error('Los pesos deben sumar 1 (ej. 0.6 examen + 0.4 presentación)');
      return;
    }
    const scaleMin = Number(v.scaleMin);
    const scaleMax = Number(v.scaleMax);
    if (!Number.isInteger(scaleMin) || !Number.isInteger(scaleMax)) {
      toast.error('La escala debe ser de números enteros');
      return;
    }
    if (scaleMin >= scaleMax) {
      toast.error('El mínimo de la escala debe ser menor que el máximo');
      return;
    }
    try {
      if (universityId) {
        await update.mutateAsync({ id: universityId, input: toInput(v) });
        toast.success('Universidad actualizada');
      } else {
        await create.mutateAsync(toInput(v));
        toast.success('Universidad creada');
      }
      router.push('/content/universities');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando la universidad');
    }
  }

  const text = (name: keyof FormValues, label: string, desc?: string) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={`u-${name}`}>{label}</FieldLabel>
          <Input id={`u-${name}`} value={field.value as string} onChange={field.onChange} />
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
              Identificación
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
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
              {text('code', 'Código', 'Ej. UCR — 2 a 20 caracteres, se guarda en mayúsculas.')}
              {text('name', 'Nombre', 'Debe coincidir con el nombre en los cortes.')}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <PercentIcon className="text-primary size-4" />
              Nota de admisión
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {text('examWeight', 'Peso del examen (0–1)', 'Ej. 0.6.')}
              {text(
                'presentationWeight',
                'Peso de la presentación (0–1)',
                'Ambos pesos deben sumar 1.',
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {text('scaleMin', 'Escala mínima', 'Entero, ej. 200.')}
              {text('scaleMax', 'Escala máxima', 'Entero mayor que la mínima, ej. 800.')}
            </div>
          </fieldset>

          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="u-active">Estado</FieldLabel>
                <div className="flex items-center gap-2">
                  <Switch id="u-active" checked={field.value} onCheckedChange={field.onChange} />
                  <span className="text-sm">{field.value ? 'Activa' : 'Inactiva'}</span>
                </div>
              </Field>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/content/universities')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {universityId ? 'Guardar cambios' : 'Crear universidad'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
