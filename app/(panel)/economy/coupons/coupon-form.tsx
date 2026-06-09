'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  CalendarIcon,
  CoinsIcon,
  MapPinIcon,
  SaveIcon,
  StoreIcon,
  TicketIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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
import { useModulesTree } from '@/hooks/use-modules-tree';
import { useSponsorOptions, useSponsorBranches } from '@/hooks/use-sponsors';
import {
  useCoupon,
  useCouponMutations,
  useSetCouponBranches,
  COUPON_CATEGORIES,
  COUPON_CATEGORY_LABELS,
  type CouponDetail,
  type CouponInput,
  type CouponTier,
  type CouponCategory,
  type CouponBranchAssignment,
} from '@/hooks/use-coupons';

type FormValues = {
  sponsorId: string;
  country: string;
  moduleId: string;
  tier: CouponTier;
  title: string;
  description: string;
  kolonesCost: number;
  isProExclusive: boolean;
  stockTotal: number | null;
  limitPerUser: number | null;
  validUntil: string;
  codePrefix: string;
  codeSuffixLen: number;
  category: CouponCategory;
  validDaysAfterRedeem: number;
};

function toValues(d: CouponDetail): FormValues {
  return {
    sponsorId: d.sponsorId,
    country: d.country,
    moduleId: d.moduleId ?? '',
    tier: d.tier,
    title: d.title,
    description: d.description,
    kolonesCost: d.kolonesCost,
    isProExclusive: d.isProExclusive,
    stockTotal: d.stockTotal,
    limitPerUser: d.limitPerUser,
    validUntil: d.validUntil ? d.validUntil.slice(0, 10) : '',
    codePrefix: d.codePrefix ?? '',
    codeSuffixLen: d.codeSuffixLen,
    category: d.category,
    validDaysAfterRedeem: d.validDaysAfterRedeem,
  };
}

function toInput(v: FormValues, conditions: string[]): CouponInput {
  return {
    sponsorId: v.sponsorId,
    title: v.title.trim(),
    description: v.description.trim(),
    tier: v.tier,
    kolonesCost: v.kolonesCost,
    country: v.country,
    moduleId: v.moduleId || null,
    isProExclusive: v.isProExclusive,
    stockTotal: v.stockTotal,
    validUntil: v.validUntil ? new Date(`${v.validUntil}T00:00:00.000Z`).toISOString() : null,
    codePrefix: v.codePrefix.trim() || null,
    codeSuffixLen: v.codeSuffixLen,
    limitPerUser: v.limitPerUser,
    category: v.category,
    conditions,
    validDaysAfterRedeem: v.validDaysAfterRedeem,
  };
}

export function CouponForm({ couponId }: { couponId?: string }) {
  const { data: detail, isLoading } = useCoupon(couponId ?? '');
  if (couponId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!detail) return <p className="text-muted-foreground text-sm">Cupón no encontrado.</p>;
    return (
      <CouponFormInner
        couponId={couponId}
        initial={toValues(detail)}
        initialConditions={detail.conditions}
        initialBranches={detail.couponBranches}
      />
    );
  }
  return <CouponFormInner />;
}

function CouponFormInner({
  couponId,
  initial,
  initialConditions,
  initialBranches,
}: {
  couponId?: string;
  initial?: FormValues;
  initialConditions?: string[];
  initialBranches?: CouponBranchAssignment[];
}) {
  const router = useRouter();
  const { create, update } = useCouponMutations();
  const setBranches = useSetCouponBranches();
  const form = useForm<FormValues>({
    defaultValues: initial ?? {
      sponsorId: '',
      country: COUNTRIES[0]?.code ?? 'CR',
      moduleId: '',
      tier: 'basico',
      title: '',
      description: '',
      kolonesCost: 0,
      isProExclusive: false,
      stockTotal: null,
      limitPerUser: 1,
      validUntil: '',
      codePrefix: '',
      codeSuffixLen: 6,
      category: 'academico',
      validDaysAfterRedeem: 30,
    },
  });
  const country = useWatch({ control: form.control, name: 'country' });
  const sponsorId = useWatch({ control: form.control, name: 'sponsorId' });
  const { data: sponsors } = useSponsorOptions();
  const { data: tree } = useModulesTree(country);
  const modules = tree ?? [];

  const [conditions, setConditions] = useState<string[]>(initialConditions ?? []);
  const [conditionDraft, setConditionDraft] = useState('');
  const [branchSel, setBranchSel] = useState<Map<string, string>>(
    () =>
      new Map(
        (initialBranches ?? []).map((b) => [
          b.branchId,
          b.stockRemaining === null ? '' : String(b.stockRemaining),
        ]),
      ),
  );

  function addCondition(): void {
    const text = conditionDraft.trim();
    if (!text || conditions.length >= 12) return;
    setConditions((c) => [...c, text]);
    setConditionDraft('');
  }

  async function submit(v: FormValues): Promise<void> {
    try {
      const branches = Array.from(branchSel.entries()).map(([branchId, stock]) => ({
        branchId,
        stockRemaining: stock.trim() === '' ? null : Number(stock),
      }));
      let id = couponId;
      if (couponId) {
        await update.mutateAsync({ id: couponId, input: toInput(v, conditions) });
      } else {
        id = await create.mutateAsync(toInput(v, conditions));
      }
      if (id) await setBranches.mutateAsync({ couponId: id, branches });
      toast.success(couponId ? 'Cupón actualizado' : 'Cupón creado');
      router.push('/economy/coupons');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el cupón');
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <StoreIcon className="text-primary size-4" />
              Sponsor y alcance
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('moduleId', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                name="sponsorId"
                control={form.control}
                rules={{ required: 'Elegí un sponsor' }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Sponsor</FieldLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Elegí un sponsor" />
                      </SelectTrigger>
                      <SelectContent>
                        {(sponsors ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                        <SelectItem value="basico">Básico</SelectItem>
                        <SelectItem value="estandar">Estándar</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
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
                    <FieldLabel>Módulo (opcional)</FieldLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todo el país" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Todo el país</SelectItem>
                        {modules.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            <Controller
              name="isProExclusive"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch id="c-pro" checked={field.value} onCheckedChange={field.onChange} />
                  <FieldLabel htmlFor="c-pro">Exclusivo para usuarios Pro</FieldLabel>
                </Field>
              )}
            />
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <TicketIcon className="text-primary size-4" />
              Contenido
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="title"
                control={form.control}
                rules={{ required: 'Requerido' }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                    <FieldLabel htmlFor="c-title">Título</FieldLabel>
                    <Input {...field} id="c-title" maxLength={200} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Categoría</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUPON_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {COUPON_CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FieldLabel htmlFor="c-desc">Descripción</FieldLabel>
                  <Textarea
                    {...field}
                    id="c-desc"
                    rows={2}
                    maxLength={500}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Field>
              <FieldLabel>Condiciones</FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={conditionDraft}
                  onChange={(e) => setConditionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCondition();
                    }
                  }}
                  placeholder="Ej: No acumulable con otras promos"
                  maxLength={200}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addCondition}
                  disabled={conditions.length >= 12}
                >
                  Agregar
                </Button>
              </div>
              {conditions.length > 0 && (
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {conditions.map((c, i) => (
                    <li
                      key={`${c}-${i}`}
                      className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
                    >
                      <span className="break-all">{c}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        aria-label="Quitar condición"
                        onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <XIcon className="size-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <FieldDescription>
                Términos que ve el usuario en el detalle del cupón (máx 12).
              </FieldDescription>
            </Field>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <CoinsIcon className="text-primary size-4" />
              Económico y stock
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="kolonesCost"
                control={form.control}
                rules={{ required: 'Requerido', min: { value: 0, message: '≥ 0' } }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="c-cost">Costo en Kolones</FieldLabel>
                    <Input
                      id="c-cost"
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
                name="stockTotal"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="c-stock">Stock total</FieldLabel>
                    <Input
                      id="c-stock"
                      type="number"
                      min={0}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <FieldDescription>Vacío = ilimitado</FieldDescription>
                  </Field>
                )}
              />
              <Controller
                name="limitPerUser"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="c-limit">Límite por usuario</FieldLabel>
                    <Input
                      id="c-limit"
                      type="number"
                      min={1}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <FieldDescription>Vacío = ilimitado</FieldDescription>
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="text-primary size-4" />
              Código y vigencia
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Controller
                name="validUntil"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="c-valid">Válido hasta</FieldLabel>
                    <DatePicker
                      id="c-valid"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Sin vencimiento"
                    />
                    <FieldDescription>Vacío = sin vencimiento</FieldDescription>
                  </Field>
                )}
              />
              <Controller
                name="validDaysAfterRedeem"
                control={form.control}
                rules={{ min: { value: 1, message: '≥ 1' }, max: { value: 365, message: '≤ 365' } }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="c-validdays">Días tras canje</FieldLabel>
                    <Input
                      id="c-validdays"
                      type="number"
                      min={1}
                      max={365}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? 30 : Number(e.target.value))
                      }
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="codePrefix"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="c-prefix">Prefijo de código</FieldLabel>
                    <Input id="c-prefix" maxLength={10} placeholder="KOD" {...field} />
                  </Field>
                )}
              />
              <Controller
                name="codeSuffixLen"
                control={form.control}
                rules={{ min: { value: 4, message: '4–12' }, max: { value: 12, message: '4–12' } }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="c-suffix">Largo del sufijo</FieldLabel>
                    <Input
                      id="c-suffix"
                      type="number"
                      min={4}
                      max={12}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 6 : Number(e.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-2">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <MapPinIcon className="text-primary size-4" />
              Sucursales donde vale
            </legend>
            <CouponBranchSelector sponsorId={sponsorId} value={branchSel} onChange={setBranchSel} />
            <FieldDescription>
              Sin sucursales = cupón sin local (canje directo, stock global).
            </FieldDescription>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/economy/coupons')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              {couponId ? 'Guardar cambios' : 'Crear cupón'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CouponBranchSelector({
  sponsorId,
  value,
  onChange,
}: {
  sponsorId: string;
  value: Map<string, string>;
  onChange: (next: Map<string, string>) => void;
}) {
  const { data: branches, isLoading } = useSponsorBranches(sponsorId);

  if (!sponsorId) {
    return (
      <p className="text-muted-foreground text-sm">Elegí un sponsor para asignar sucursales.</p>
    );
  }
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if ((branches?.length ?? 0) === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Este sponsor no tiene sucursales. Agregalas desde el detalle del sponsor.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {branches!.map((b) => {
        const selected = value.has(b.id);
        return (
          <div key={b.id} className="flex items-center gap-3 rounded-md border p-2">
            <Checkbox
              checked={selected}
              aria-label={`Incluir ${b.label}`}
              onCheckedChange={(c) => {
                const next = new Map(value);
                if (c) next.set(b.id, '');
                else next.delete(b.id);
                onChange(next);
              }}
            />
            <span className="flex-1 text-sm">
              {b.label}
              {!b.isActive && ' · inactiva'}
            </span>
            <Input
              type="number"
              min={0}
              className="w-28"
              placeholder="∞"
              disabled={!selected}
              value={value.get(b.id) ?? ''}
              onChange={(e) => {
                const next = new Map(value);
                next.set(b.id, e.target.value);
                onChange(next);
              }}
            />
          </div>
        );
      })}
      <p className="text-muted-foreground text-xs">
        Marcá las sucursales donde vale el cupón. Stock vacío = ilimitado en esa sucursal.
      </p>
    </div>
  );
}
