'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { SaveIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DIMENSION_LABELS,
  useRiasecTypeMutations,
  type RiasecType,
} from '@/hooks/use-riasec-types';

const FormSchema = z.object({
  title: z.string().trim().min(1, 'Requerido').max(120),
  summary: z.string().trim().min(1, 'Requerido').max(300),
  description: z.string().trim().min(1, 'Requerido').max(2000),
  strengths: z.string(),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

export function RiasecTypeDialog({
  type,
  open,
  onOpenChange,
}: {
  type: RiasecType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { update } = useRiasecTypeMutations();
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: type.title,
      summary: type.summary,
      description: type.description,
      strengths: type.strengths.join('\n'),
      isActive: type.isActive,
    },
  });

  async function onSubmit(v: FormValues): Promise<void> {
    const strengths = v.strengths
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await update.mutateAsync({
        dimension: type.dimension,
        input: {
          title: v.title.trim(),
          summary: v.summary.trim(),
          description: v.description.trim(),
          strengths,
          isActive: v.isActive,
        },
      });
      toast.success('Tipo actualizado');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el tipo');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type.dimension} — {DIMENSION_LABELS[type.dimension]}
          </DialogTitle>
          <DialogDescription>
            Perfil del tipo RIASEC que se muestra en el resultado del test vocacional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="rt-title">Título</FieldLabel>
                <Input {...field} id="rt-title" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="summary"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="rt-summary">Resumen (una línea)</FieldLabel>
                <Input {...field} id="rt-summary" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="rt-desc">Descripción</FieldLabel>
                <Textarea {...field} id="rt-desc" rows={4} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="strengths"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="rt-strengths">Fortalezas (una por línea)</FieldLabel>
                <Textarea {...field} id="rt-strengths" rows={3} />
              </Field>
            )}
          />
          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="rt-active">Estado</FieldLabel>
                <div className="flex items-center gap-2">
                  <Switch id="rt-active" checked={field.value} onCheckedChange={field.onChange} />
                  <span className="text-sm">{field.value ? 'Activo' : 'Inactivo'}</span>
                </div>
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {form.formState.isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
