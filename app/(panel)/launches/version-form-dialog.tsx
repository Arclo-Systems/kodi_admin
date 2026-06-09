'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVersionMutations, type AppVersion } from '@/hooks/use-launches';

const optionalHttpUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Debe ser una URL http(s)');

const FormSchema = z.object({
  platform: z.enum(['ios', 'android']),
  version: z.string().trim().regex(/^\d+\.\d+\.\d+$/, 'Usar versión x.y.z'),
  releaseDate: z.string().min(1, 'Requerido'),
  releaseNotes: z.string().trim().max(5_000),
  storeUrl: optionalHttpUrl,
});
type FormValues = z.infer<typeof FormSchema>;

function toDefaults(v: AppVersion | null): FormValues {
  return {
    platform: v?.platform ?? 'ios',
    version: v?.version ?? '',
    releaseDate: v?.releaseDate ? v.releaseDate.slice(0, 10) : '',
    releaseNotes: v?.releaseNotes ?? '',
    storeUrl: v?.storeUrl ?? '',
  };
}

export function VersionFormDialog({
  version,
  open,
  onOpenChange,
}: {
  version: AppVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useVersionMutations();
  const isEdit = version !== null;
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: toDefaults(version) });

  async function onSubmit(v: FormValues): Promise<void> {
    const input = {
      platform: v.platform,
      version: v.version,
      releaseDate: v.releaseDate,
      releaseNotes: v.releaseNotes || undefined,
      storeUrl: v.storeUrl || undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: version.id, input });
        toast.success('Versión actualizada');
      } else {
        await create.mutateAsync(input);
        toast.success('Versión creada');
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar versión' : 'Nueva versión'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="platform"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="v-platform">Plataforma</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="v-platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="version"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="v-version">Versión</FieldLabel>
                <Input {...field} id="v-version" placeholder="2.4.0" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="releaseDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="v-date">Fecha de publicación</FieldLabel>
                <DatePicker
                  id="v-date"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="releaseNotes"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="v-notes">Notas (opcional)</FieldLabel>
                <Textarea {...field} id="v-notes" rows={3} />
              </Field>
            )}
          />
          <Controller
            name="storeUrl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="v-store">Link a la store (opcional)</FieldLabel>
                <Input {...field} id="v-store" placeholder="https://…" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
