'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CalendarIcon, ImageIcon, LayersIcon, PackageIcon, SaveIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
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
import { StoreAssetUpload } from './store-asset-upload';
import {
  CATEGORY_LABELS,
  ITEM_TYPE_LABELS,
  REQUIRES_PLAN_LABELS,
  STORE_ITEM_TYPES,
  TIER_LABELS,
  useStoreItem,
  useStoreItemMutations,
  type StoreCategory,
  type StoreItem,
  type StoreItemInput,
  type StoreItemType,
  type StorePlan,
  type StoreTier,
} from '@/hooks/use-store';

const GLOBAL = '__global__';
const NO_PLAN = '__none__';
const PLANS: StorePlan[] = ['basico', 'plus', 'pro'];
const TIERS: StoreTier[] = ['basico', 'estandar', 'premium'];
const CATEGORIES: StoreCategory[] = ['cosmetic', 'functional'];

type FormValues = {
  name: string;
  description: string;
  category: StoreCategory;
  itemType: StoreItemType;
  tier: StoreTier;
  kokosPrice: number;
  requiresPlan: StorePlan | '';
  country: string;
  previewUrl: string;
  assetUrl: string | null;
  releaseAt: string;
  expiresAt: string;
  isActive: boolean;
  purchasable: boolean;
};

function toValues(i: StoreItem): FormValues {
  return {
    name: i.name,
    description: i.description,
    category: i.category,
    itemType: i.itemType,
    tier: i.tier,
    kokosPrice: i.kokosPrice,
    requiresPlan: i.requiresPlan ?? '',
    country: i.country ?? '',
    previewUrl: i.previewUrl,
    assetUrl: i.assetUrl,
    releaseAt: i.releaseAt ? i.releaseAt.slice(0, 16) : '',
    expiresAt: i.expiresAt ? i.expiresAt.slice(0, 16) : '',
    isActive: i.isActive,
    purchasable: i.purchasable,
  };
}

function toUpdateInput(v: FormValues): Omit<StoreItemInput, 'category'> {
  return {
    name: v.name.trim(),
    description: v.description.trim(),
    itemType: v.itemType,
    tier: v.tier,
    kokosPrice: v.kokosPrice,
    requiresPlan: v.requiresPlan || null,
    country: v.country || null,
    previewUrl: v.previewUrl.trim(),
    assetUrl: v.assetUrl || null,
    releaseAt: v.releaseAt ? new Date(v.releaseAt).toISOString() : null,
    expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null,
    isActive: v.isActive,
    purchasable: v.purchasable,
  };
}

function toInput(v: FormValues): StoreItemInput {
  return { category: v.category, ...toUpdateInput(v) };
}

export function StoreForm({ itemId }: { itemId?: string }) {
  const { data: detail, isLoading } = useStoreItem(itemId ?? '');
  if (itemId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) return <p className="text-muted-foreground text-sm">Ítem no encontrado.</p>;
    return <StoreFormInner itemId={itemId} initial={toValues(detail)} ownedBy={detail.ownedBy} />;
  }
  return <StoreFormInner />;
}

function StoreFormInner({
  itemId,
  initial,
  ownedBy,
}: {
  itemId?: string;
  initial?: FormValues;
  ownedBy?: number;
}) {
  const router = useRouter();
  const { create, update } = useStoreItemMutations();
  const form = useForm<FormValues>({
    defaultValues: initial ?? {
      name: '',
      description: '',
      category: 'cosmetic',
      itemType: 'frame',
      tier: 'basico',
      kokosPrice: 0,
      requiresPlan: '',
      country: '',
      previewUrl: '',
      assetUrl: null,
      releaseAt: '',
      expiresAt: '',
      isActive: true,
      purchasable: true,
    },
  });

  async function submit(v: FormValues): Promise<void> {
    if (!v.previewUrl) {
      toast.error('Subí una imagen de preview');
      return;
    }
    if (v.releaseAt && v.expiresAt && new Date(v.releaseAt) >= new Date(v.expiresAt)) {
      toast.error('La fecha de salida debe ser anterior a la de expiración');
      return;
    }
    try {
      if (itemId) {
        await update.mutateAsync({ id: itemId, input: toUpdateInput(v) });
        toast.success('Ítem actualizado');
      } else {
        await create.mutateAsync(toInput(v));
        toast.success('Ítem creado');
      }
      router.push('/economy/store');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el ítem');
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
          {itemId && ownedBy !== undefined && ownedBy > 0 && (
            <Alert>
              <AlertDescription>
                {ownedBy} usuario(s) ya tienen este ítem. Cambiar precio, tipo o tier NO afecta lo ya
                comprado.
              </AlertDescription>
            </Alert>
          )}

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <PackageIcon className="text-primary size-4" />
              Contenido
            </legend>

            <Controller
              name="name"
              control={form.control}
              rules={{ required: 'Requerido' }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="s-name">Nombre</FieldLabel>
                  <Input {...field} id="s-name" maxLength={120} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              rules={{ required: 'Requerido' }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="s-desc">Descripción</FieldLabel>
                  <Textarea
                    {...field}
                    id="s-desc"
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
              <LayersIcon className="text-primary size-4" />
              Clasificación y precio
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Categoría</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!itemId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {itemId && <FieldDescription>No editable luego de crear.</FieldDescription>}
                  </Field>
                )}
              />
              <Controller
                name="itemType"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Tipo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STORE_ITEM_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {ITEM_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="tier"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Tier</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TIER_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="kokosPrice"
                control={form.control}
                rules={{ required: 'Requerido', min: { value: 0, message: '≥ 0' } }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="s-price">Precio (Kokos)</FieldLabel>
                    <Input
                      id="s-price"
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
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select
                      value={field.value || GLOBAL}
                      onValueChange={(v) => field.onChange(v === GLOBAL ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GLOBAL}>Global (todos)</SelectItem>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="requiresPlan"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Desbloqueo por plan (opcional)</FieldLabel>
                    <Select
                      value={field.value || NO_PLAN}
                      onValueChange={(v) => field.onChange(v === NO_PLAN ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PLAN}>Ninguno (gratis o Kokos)</SelectItem>
                        {PLANS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {REQUIRES_PLAN_LABELS[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>Con plan, el precio en Kokos debe ser 0.</FieldDescription>
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="text-primary size-4" />
              Recursos
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="previewUrl"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Imagen de vista previa (tienda)</FieldLabel>
                    <StoreAssetUpload
                      value={field.value || null}
                      onChange={(url) => field.onChange(url ?? '')}
                    />
                    <FieldDescription>
                      Thumbnail que se muestra en la tienda y el inventario (requerida).
                    </FieldDescription>
                  </Field>
                )}
              />
              <Controller
                name="assetUrl"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Archivo del ítem — al equipar (opcional)</FieldLabel>
                    <StoreAssetUpload value={field.value} onChange={field.onChange} />
                    <FieldDescription>
                      Recurso que se aplica al equipar (el PNG del marco, la animación). Los títulos
                      no llevan.
                    </FieldDescription>
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="text-primary size-4" />
              Vigencia y estado
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="releaseAt"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="s-release">Disponible desde</FieldLabel>
                    <DateTimePicker id="s-release" value={field.value} onChange={field.onChange} />
                    <FieldDescription>Vacío = disponible ya.</FieldDescription>
                  </Field>
                )}
              />
              <Controller
                name="expiresAt"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="s-expires">Expira</FieldLabel>
                    <DateTimePicker id="s-expires" value={field.value} onChange={field.onChange} />
                    <FieldDescription>Vacío = sin expiración.</FieldDescription>
                  </Field>
                )}
              />
            </div>

            <Controller
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="s-active">Estado</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Switch id="s-active" checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm">{field.value ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </Field>
              )}
            />

            <Controller
              name="purchasable"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch id="s-purchasable" checked={field.value} onCheckedChange={field.onChange} />
                  <FieldLabel htmlFor="s-purchasable">Comprable en tienda</FieldLabel>
                </Field>
              )}
            />
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/economy/store')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {itemId ? 'Guardar cambios' : 'Crear ítem'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
