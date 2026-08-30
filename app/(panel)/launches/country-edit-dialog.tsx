'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCountryRolloutActions,
  useCountryRolloutMutation,
  type CountryLaunchStatus,
  type CountryRollout,
} from '@/hooks/use-launches';

const STATUS_OPTIONS: { value: CountryLaunchStatus; label: string }[] = [
  { value: 'planned', label: 'Planeado' },
  { value: 'in_preparation', label: 'En preparación' },
  { value: 'live', label: 'Live' },
  { value: 'paused', label: 'Pausado' },
];

// Vacío = sin dato; si tiene valor, entero > 0.
const enteroOpcional = (mensaje: string) =>
  z
    .string()
    .trim()
    .refine((s) => s === '' || (/^\d+$/.test(s) && Number(s) > 0), mensaje);

// Un solo schema para alta y edición: en edición el código viene precargado del país (siempre
// ISO-2 válido) y el campo va deshabilitado, así que la regla no estorba.
const FormSchema = z.object({
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Código ISO de 2 letras (ej. CO)'),
  name: z.string().trim().min(2, 'Ingresá el nombre del país').max(80),
  status: z.enum(['planned', 'in_preparation', 'live', 'paused']),
  targetDate: z.string(),
  launchedAt: z.string(),
  notes: z.string().trim().max(2_000),
  userGoal: enteroOpcional('Ingresá un entero mayor a 0'),
  publicoAnual: enteroOpcional('Ingresá un entero mayor a 0'),
});
type FormValues = z.infer<typeof FormSchema>;

const aNumero = (s: string): number | null => (s.trim() === '' ? null : Number(s));

/** `rollout` en null = alta de un país nuevo. */
export function CountryFormDialog({
  rollout,
  open,
  onOpenChange,
}: {
  rollout: CountryRollout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const esAlta = rollout === null;
  const update = useCountryRolloutMutation();
  const { create } = useCountryRolloutActions();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      country: rollout?.country ?? '',
      name: rollout?.name ?? '',
      status: rollout?.status ?? 'planned',
      targetDate: rollout?.targetDate?.slice(0, 10) ?? '',
      launchedAt: rollout?.launchedAt?.slice(0, 10) ?? '',
      notes: rollout?.notes ?? '',
      userGoal: rollout?.userGoal != null ? String(rollout.userGoal) : '',
      publicoAnual: rollout?.publicoAnual != null ? String(rollout.publicoAnual) : '',
    },
  });

  const selectedStatus = useWatch({ control: form.control, name: 'status' });
  const goingLive = selectedStatus === 'live' && rollout?.status !== 'live';

  async function onSubmit(v: FormValues): Promise<void> {
    const campos = {
      name: v.name,
      status: v.status,
      targetDate: v.targetDate || null,
      launchedAt: v.launchedAt || null,
      notes: v.notes || null,
      userGoal: aNumero(v.userGoal),
      publicoAnual: aNumero(v.publicoAnual),
    };
    try {
      if (esAlta) {
        await create.mutateAsync({ ...campos, country: v.country.toUpperCase() });
        toast.success('País agregado al roadmap');
      } else {
        await update.mutateAsync({ country: rollout.country, input: campos });
        toast.success('País actualizado');
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
          <DialogTitle>{esAlta ? 'Agregar país al roadmap' : rollout.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <Controller
              name="country"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="c-code">Código</FieldLabel>
                  <Input
                    {...field}
                    id="c-code"
                    maxLength={2}
                    autoCapitalize="characters"
                    placeholder="CO"
                    disabled={!esAlta}
                    className="uppercase"
                  />
                  {fieldState.error && (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  )}
                </Field>
              )}
            />
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="c-name">Nombre</FieldLabel>
                  <Input {...field} id="c-name" placeholder="Colombia" />
                  {fieldState.error && (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  )}
                </Field>
              )}
            />
          </div>

          {esAlta && (
            <Alert>
              <AlertDescription>
                Agregar un país al roadmap es planeación: <strong>no</strong> lo habilita en la app.
                Para que se pueda usar ahí hace falta una versión nueva.
              </AlertDescription>
            </Alert>
          )}

          <Controller
            name="status"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="c-status">Estado</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="c-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          {goingLive && (
            <Alert>
              <AlertDescription>
                ⚠️ Marcar como <strong>Live</strong> habilita el registro de usuarios en este país.
              </AlertDescription>
            </Alert>
          )}
          <Controller
            name="targetDate"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="c-target">Fecha objetivo (opcional)</FieldLabel>
                <DatePicker id="c-target" value={field.value} onChange={field.onChange} placeholder="Sin fecha" />
              </Field>
            )}
          />
          <Controller
            name="launchedAt"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="c-launched">Fecha de lanzamiento (opcional)</FieldLabel>
                <DatePicker id="c-launched" value={field.value} onChange={field.onChange} placeholder="Sin fecha" />
              </Field>
            )}
          />
          <Controller
            name="publicoAnual"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor="c-publico">Público anual (opcional)</FieldLabel>
                <Input
                  {...field}
                  id="c-publico"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Ej. 243000"
                />
                <p className="text-muted-foreground text-xs">
                  Personas por año que podrían usar Kodi en ese país. Ordena el ranking.
                </p>
                {fieldState.error && (
                  <p className="text-destructive text-xs">{fieldState.error.message}</p>
                )}
              </Field>
            )}
          />
          <Controller
            name="userGoal"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor="c-goal">Meta de usuarios (opcional)</FieldLabel>
                <Input
                  {...field}
                  id="c-goal"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Ej. 10000"
                />
                {fieldState.error && (
                  <p className="text-destructive text-xs">{fieldState.error.message}</p>
                )}
              </Field>
            )}
          />
          <Controller
            name="notes"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="c-notes">Notas (opcional)</FieldLabel>
                <Textarea {...field} id="c-notes" rows={3} />
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando…' : esAlta ? 'Agregar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
