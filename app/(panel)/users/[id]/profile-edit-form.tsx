'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { UserDetail } from '@/lib/user-detail';

const ProfileSchema = z.object({
  displayName: z.string().min(1, 'Requerido').max(80),
  username: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === '' || v.length >= 3, 'Mínimo 3 caracteres'),
  dailyGoalTarget: z.number().int().min(5, 'Mínimo 5').max(200, 'Máximo 200'),
  goalStreakDays: z.number().int().min(0, 'Mínimo 0').max(3650),
  soundsEnabled: z.boolean(),
  reason: z.string().min(3, 'Mínimo 3 caracteres').max(500),
});
type ProfileValues = z.infer<typeof ProfileSchema>;

export function ProfileEditForm({ user }: { user: UserDetail }) {
  const router = useRouter();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      displayName: user.displayName,
      username: user.username ?? '',
      dailyGoalTarget: user.dailyGoalTarget,
      goalStreakDays: user.goalStreakDays,
      soundsEnabled: user.soundsEnabled,
      reason: '',
    },
  });

  async function submit(values: ProfileValues): Promise<void> {
    const payload: Record<string, unknown> = {
      displayName: values.displayName,
      dailyGoalTarget: values.dailyGoalTarget,
      goalStreakDays: values.goalStreakDays,
      soundsEnabled: values.soundsEnabled,
      reason: values.reason,
    };
    // username solo si cambió y no está vacío (el PATCH es parcial).
    const username = values.username.trim();
    if (username && username !== (user.username ?? '')) payload.username = username;

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: { message?: string }; message?: string }
        | null;
      toast.error(data?.error?.message ?? data?.message ?? 'Error guardando el perfil');
      return;
    }
    toast.success('Perfil actualizado');
    form.resetField('reason');
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <FieldGroup>
        <Controller
          name="displayName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="pe-name">Nombre</FieldLabel>
              <Input {...field} id="pe-name" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="username"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="pe-username">Usuario</FieldLabel>
              <Input
                {...field}
                id="pe-username"
                placeholder="sin @ (mín. 3)"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="dailyGoalTarget"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="pe-goal">Meta diaria (preguntas)</FieldLabel>
              <Input
                id="pe-goal"
                type="number"
                value={Number.isNaN(field.value) ? '' : field.value}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)
                }
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="goalStreakDays"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="pe-goal-streak">Meta de racha (días)</FieldLabel>
              <Input
                id="pe-goal-streak"
                type="number"
                value={Number.isNaN(field.value) ? '' : field.value}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)
                }
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="soundsEnabled"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch id="pe-sounds" checked={field.value} onCheckedChange={field.onChange} />
              <FieldLabel htmlFor="pe-sounds">Sonidos activados</FieldLabel>
            </Field>
          )}
        />
        <Controller
          name="reason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="pe-reason">Motivo del cambio</FieldLabel>
              <Textarea {...field} id="pe-reason" placeholder="Mínimo 3 caracteres" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
