'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlusIcon, SaveIcon } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RIASEC_DIMENSIONS,
  DIMENSION_LABELS,
  useVocItemMutations,
  type VocItem,
} from '@/hooks/use-vocational-items';

const FormSchema = z.object({
  text: z.string().trim().min(1, 'Requerido').max(300),
  dimension: z.enum(['R', 'I', 'A', 'S', 'E', 'C']),
  order: z.number().int().min(0),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

function toDefaults(item: VocItem | null, nextOrder: number): FormValues {
  return {
    text: item?.text ?? '',
    dimension: item?.dimension ?? 'R',
    order: item?.order ?? nextOrder,
    isActive: item?.isActive ?? true,
  };
}

export function VocItemDialog({
  item,
  nextOrder,
  open,
  onOpenChange,
}: {
  item: VocItem | null;
  nextOrder: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useVocItemMutations();
  const isEdit = item !== null;
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toDefaults(item, nextOrder),
  });

  async function onSubmit(v: FormValues): Promise<void> {
    try {
      if (isEdit) {
        await update.mutateAsync({ id: item.id, input: v });
        toast.success('Ítem actualizado');
      } else {
        await create.mutateAsync(v);
        toast.success('Ítem creado');
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el ítem');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar ítem' : 'Nuevo ítem'}</DialogTitle>
          <DialogDescription>
            Enunciado del test vocacional, su dimensión RIASEC y el orden en que aparece.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="text"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="vi-text">Enunciado</FieldLabel>
                <Textarea
                  {...field}
                  id="vi-text"
                  rows={3}
                  placeholder="Ej. Reparar un equipo electrónico"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="dimension"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="vi-dim">Dimensión RIASEC</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="vi-dim">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RIASEC_DIMENSIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d} — {DIMENSION_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="order"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="vi-order">Orden</FieldLabel>
                  <Input
                    id="vi-order"
                    type="number"
                    min={0}
                    value={Number.isNaN(field.value) ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="vi-active">Estado</FieldLabel>
                <div className="flex items-center gap-2">
                  <Switch id="vi-active" checked={field.value} onCheckedChange={field.onChange} />
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
              {isEdit ? <SaveIcon className="size-4" /> : <PlusIcon className="size-4" />}
              {form.formState.isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear ítem'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
