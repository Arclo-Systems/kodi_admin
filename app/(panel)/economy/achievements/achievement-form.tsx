'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AwardIcon, CoinsIcon, SaveIcon, Settings2Icon, TargetIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AssetUpload } from '@/components/admin/asset-upload';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConditionBuilder } from './condition-builder';
import {
  useAchievement,
  useAchievementMutations,
  type Achievement,
  type AchievementCondition,
  type AchievementInput,
  type AchievementTier,
} from '@/hooks/use-achievements';

const TIERS: { value: AchievementTier; label: string }[] = [
  { value: 'common', label: 'Común' },
  { value: 'uncommon', label: 'Poco común' },
  { value: 'rare', label: 'Raro' },
  { value: 'epic', label: 'Épico' },
];

type FormValues = {
  code: string;
  name: string;
  description: string;
  tier: AchievementTier;
  kokosReward: number;
  iconUrl: string;
  condition: AchievementCondition;
  isOneTime: boolean;
  isActive: boolean;
};

function toValues(a: Achievement): FormValues {
  return {
    code: a.code,
    name: a.name,
    description: a.description,
    tier: a.tier,
    kokosReward: a.kokosReward,
    iconUrl: a.iconUrl,
    condition: a.condition,
    isOneTime: a.isOneTime,
    isActive: a.isActive,
  };
}

function toUpdateInput(v: FormValues): Omit<AchievementInput, 'code'> {
  return {
    name: v.name.trim(),
    description: v.description.trim(),
    tier: v.tier,
    kokosReward: v.kokosReward,
    iconUrl: v.iconUrl.trim(),
    condition: v.condition,
    isOneTime: v.isOneTime,
    isActive: v.isActive,
  };
}

function toInput(v: FormValues): AchievementInput {
  return { code: v.code.trim(), ...toUpdateInput(v) };
}

export function AchievementForm({ achievementId }: { achievementId?: string }) {
  const { data: detail, isLoading } = useAchievement(achievementId ?? '');
  if (achievementId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) return <p className="text-muted-foreground text-sm">Logro no encontrado.</p>;
    return (
      <AchievementFormInner
        achievementId={achievementId}
        initial={toValues(detail)}
        unlockedBy={detail.unlockedBy}
      />
    );
  }
  return <AchievementFormInner />;
}

function AchievementFormInner({
  achievementId,
  initial,
  unlockedBy,
}: {
  achievementId?: string;
  initial?: FormValues;
  unlockedBy?: number;
}) {
  const router = useRouter();
  const { create, update } = useAchievementMutations();
  const form = useForm<FormValues>({
    defaultValues: initial ?? {
      code: '',
      name: '',
      description: '',
      tier: 'common',
      kokosReward: 0,
      iconUrl: '',
      condition: { type: 'manual' },
      isOneTime: true,
      isActive: true,
    },
  });

  async function submit(v: FormValues): Promise<void> {
    try {
      if (achievementId) {
        await update.mutateAsync({ id: achievementId, input: toUpdateInput(v) });
        toast.success('Logro actualizado');
      } else {
        await create.mutateAsync(toInput(v));
        toast.success('Logro creado');
      }
      router.push('/economy/achievements');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el logro');
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
          {achievementId && unlockedBy !== undefined && unlockedBy > 0 && (
            <Alert>
              <AlertDescription>
                {unlockedBy} usuario(s) ya tienen este logro. Cambiar la recompensa o la condición NO
                les re-paga ni re-evalúa — usá “Re-otorgar” en el detalle para pagar Kokos.
              </AlertDescription>
            </Alert>
          )}

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <AwardIcon className="text-primary size-4" />
              Identidad
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="code"
                control={form.control}
                rules={{
                  required: 'Requerido',
                  pattern: { value: /^[a-z0-9_]+$/, message: 'snake_case alfanumérico' },
                }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="a-code">Código</FieldLabel>
                    <Input
                      {...field}
                      id="a-code"
                      maxLength={60}
                      disabled={!!achievementId}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Identificador único (snake_case). No editable luego de crear.
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="name"
                control={form.control}
                rules={{ required: 'Requerido' }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="a-name">Nombre</FieldLabel>
                    <Input {...field} id="a-name" maxLength={120} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="description"
              control={form.control}
              rules={{ required: 'Requerido' }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="a-desc">Descripción</FieldLabel>
                  <Textarea
                    {...field}
                    id="a-desc"
                    rows={2}
                    maxLength={500}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <CoinsIcon className="text-primary size-4" />
              Recompensa y rareza
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="tier"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Rareza</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="kokosReward"
                control={form.control}
                rules={{ required: 'Requerido', min: { value: 0, message: '≥ 0' } }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="a-kokos">Recompensa (Kokos)</FieldLabel>
                    <Input
                      id="a-kokos"
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="iconUrl"
                control={form.control}
                rules={{ required: 'Requerido' }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Ícono del logro</FieldLabel>
                    <AssetUpload
                      value={field.value || null}
                      onChange={(url) => field.onChange(url ?? '')}
                      endpoint="/api/admin/economy/achievements/upload-icon"
                      label="Subir ícono del logro"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <TargetIcon className="text-primary size-4" />
              Condición
            </legend>
            <Controller
              name="condition"
              control={form.control}
              render={({ field }) => (
                <ConditionBuilder value={field.value} onChange={field.onChange} />
              )}
            />
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <Settings2Icon className="text-primary size-4" />
              Configuración
            </legend>

            <Controller
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="a-active">Estado</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Switch id="a-active" checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm">{field.value ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </Field>
              )}
            />
            <Controller
              name="isOneTime"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch id="a-onetime" checked={field.value} onCheckedChange={field.onChange} />
                  <FieldLabel htmlFor="a-onetime">Una sola vez</FieldLabel>
                </Field>
              )}
            />
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/economy/achievements')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {achievementId ? 'Guardar cambios' : 'Crear logro'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
