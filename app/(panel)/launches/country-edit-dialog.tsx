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
import { useCountryRolloutMutation, type CountryLaunchStatus, type CountryRollout } from '@/hooks/use-launches';

const STATUS_OPTIONS: { value: CountryLaunchStatus; label: string }[] = [
  { value: 'planned', label: 'Planeado' },
  { value: 'in_preparation', label: 'En preparación' },
  { value: 'live', label: 'Live' },
  { value: 'paused', label: 'Pausado' },
];

const FormSchema = z.object({
  status: z.enum(['planned', 'in_preparation', 'live', 'paused']),
  targetDate: z.string(),
  launchedAt: z.string(),
  notes: z.string().trim().max(2_000),
  // Vacío = sin meta; si tiene valor, entero > 0.
  userGoal: z
    .string()
    .trim()
    .refine((s) => s === '' || (/^\d+$/.test(s) && Number(s) > 0), 'Ingresá un entero mayor a 0'),
});
type FormValues = z.infer<typeof FormSchema>;

const COUNTRY_NAME: Record<string, string> = {
  CR: 'Costa Rica',
  GT: 'Guatemala',
  SV: 'El Salvador',
  HN: 'Honduras',
  PA: 'Panamá',
  CL: 'Chile',
  MX: 'México',
  AR: 'Argentina',
};

export function CountryEditDialog({
  rollout,
  open,
  onOpenChange,
}: {
  rollout: CountryRollout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCountryRolloutMutation();
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      status: rollout.status,
      targetDate: rollout.targetDate?.slice(0, 10) ?? '',
      launchedAt: rollout.launchedAt?.slice(0, 10) ?? '',
      notes: rollout.notes ?? '',
      userGoal: rollout.userGoal != null ? String(rollout.userGoal) : '',
    },
  });

  const selectedStatus = useWatch({ control: form.control, name: 'status' });
  const goingLive = selectedStatus === 'live' && rollout.status !== 'live';

  async function onSubmit(v: FormValues): Promise<void> {
    try {
      await mutation.mutateAsync({
        country: rollout.country,
        input: {
          status: v.status,
          targetDate: v.targetDate || null,
          launchedAt: v.launchedAt || null,
          notes: v.notes || null,
          userGoal: v.userGoal.trim() === '' ? null : Number(v.userGoal),
        },
      });
      toast.success('País actualizado');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COUNTRY_NAME[rollout.country] ?? rollout.country}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
