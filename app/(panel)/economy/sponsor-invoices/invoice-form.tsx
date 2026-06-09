'use client';

import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { FileTextIcon, PackageIcon, PlusIcon, ReceiptIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSponsorOptions } from '@/hooks/use-sponsors';
import { useInvoiceMutations, type CreateInvoiceInput } from '@/hooks/use-sponsor-invoices';

type ManualItem = { description: string; quantity: number; unitPrice: number; cabysCode: string };
type FormValues = {
  sponsorId: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  includeAuto: boolean;
  notes: string;
  manualItems: ManualItem[];
};

const dateToIso = (d: string): string | undefined =>
  d ? new Date(`${d}T00:00:00.000Z`).toISOString() : undefined;

export function InvoiceForm({ initialSponsorId }: { initialSponsorId?: string }) {
  const router = useRouter();
  const { data: sponsors } = useSponsorOptions();
  const { create } = useInvoiceMutations();
  const form = useForm<FormValues>({
    defaultValues: {
      sponsorId: initialSponsorId ?? '',
      dueDate: '',
      periodStart: '',
      periodEnd: '',
      includeAuto: true,
      notes: '',
      manualItems: [],
    },
  });
  const items = useFieldArray({ control: form.control, name: 'manualItems' });
  const includeAuto = useWatch({ control: form.control, name: 'includeAuto' });
  const periodStart = useWatch({ control: form.control, name: 'periodStart' });
  const periodEnd = useWatch({ control: form.control, name: 'periodEnd' });

  async function submit(v: FormValues): Promise<void> {
    if (!v.includeAuto && v.manualItems.length === 0) {
      toast.error('Incluí productos automáticos o al menos una línea manual.');
      return;
    }
    if (!v.dueDate) {
      form.setError('dueDate', { message: 'Requerido' });
      return;
    }
    const input: CreateInvoiceInput = {
      sponsorId: v.sponsorId,
      dueDate: dateToIso(v.dueDate)!,
      periodStart: dateToIso(v.periodStart),
      periodEnd: dateToIso(v.periodEnd),
      includeAuto: v.includeAuto,
      notes: v.notes.trim() || undefined,
      manualItems: v.manualItems.map((it) => ({
        description: it.description.trim(),
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        cabysCode: it.cabysCode.trim() || undefined,
      })),
    };
    try {
      const id = await create.mutateAsync(input);
      toast.success('Factura creada como borrador');
      router.push(id ? `/economy/sponsor-invoices/${id}` : '/economy/sponsors');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error creando la factura');
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <ReceiptIcon className="text-primary size-4" />
              Factura
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                name="dueDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="inv-due">Vencimiento</FieldLabel>
                    <DatePicker
                      id="inv-due"
                      value={field.value}
                      onChange={field.onChange}
                      invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Field className="lg:col-span-2">
                <FieldLabel>Período facturado (opcional)</FieldLabel>
                <DateRangePicker
                  from={periodStart}
                  to={periodEnd}
                  onChange={(f, t) => {
                    form.setValue('periodStart', f);
                    form.setValue('periodEnd', t);
                  }}
                  placeholder="Elegí el período"
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <PackageIcon className="text-primary size-4" />
              Productos y líneas
            </legend>

            <Controller
              name="includeAuto"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch id="inv-auto" checked={field.value} onCheckedChange={field.onChange} />
                  <FieldLabel htmlFor="inv-auto">
                    Incluir productos activos del período (auto)
                  </FieldLabel>
                </Field>
              )}
            />
            {includeAuto && (
              <FieldDescription>
                Se prellenan banners/cupones/rifas/league-sponsors activos del período a precio 0;
                los ajustás en el borrador.
              </FieldDescription>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel>Líneas manuales (opcional)</FieldLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    items.append({ description: '', quantity: 1, unitPrice: 0, cabysCode: '' })
                  }
                >
                  <PlusIcon className="size-4" />
                  Agregar línea
                </Button>
              </div>
              {items.fields.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Sin líneas manuales. Agregá una o dejá que se prellenen las automáticas.
                </p>
              ) : (
                items.fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-12 items-end gap-2">
                    <Controller
                      name={`manualItems.${i}.description`}
                      control={form.control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <Input {...field} className="col-span-6" placeholder="Descripción" />
                      )}
                    />
                    <Controller
                      name={`manualItems.${i}.quantity`}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          className="col-span-2"
                          type="number"
                          min={1}
                          aria-label="Cantidad"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? 1 : Number(e.target.value))
                          }
                        />
                      )}
                    />
                    <Controller
                      name={`manualItems.${i}.unitPrice`}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          className="col-span-3"
                          type="number"
                          min={0}
                          step="0.01"
                          aria-label="Precio unitario"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                          }
                        />
                      )}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive col-span-1 size-9"
                      aria-label="Quitar línea"
                      onClick={() => items.remove(i)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <FileTextIcon className="text-primary size-4" />
              Notas
            </legend>
            <Controller
              name="notes"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="inv-notes">Notas (opcional)</FieldLabel>
                  <Textarea {...field} id="inv-notes" rows={2} maxLength={1000} />
                </Field>
              )}
            />
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              Crear factura
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
