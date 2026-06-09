'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileTextIcon, SaveIcon, WalletIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FinanceReceiptUpload } from './finance-receipt-upload';
import {
  useFinanceCategories,
  useFinanceEntry,
  useFinanceEntryMutations,
  FINANCE_CURRENCIES,
  KIND_LABELS,
  type FinanceEntry,
  type FinanceEntryInput,
  type FinanceKind,
} from '@/hooks/use-finance';

// Sentinel: el comprobante existente se mantiene si el usuario no lo toca (no se reenvía la key).
const KEEP = '__keep__';

export function FinanceEntryForm({ entryId }: { entryId?: string }) {
  const { data: entry, isLoading } = useFinanceEntry(entryId);
  if (entryId) {
    if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>;
    if (!entry) return <p className="text-muted-foreground text-sm">Movimiento no encontrado.</p>;
    return <FinanceEntryFormInner entry={entry} />;
  }
  return <FinanceEntryFormInner />;
}

function FinanceEntryFormInner({ entry }: { entry?: FinanceEntry }) {
  const router = useRouter();
  const { create, update } = useFinanceEntryMutations();

  const [kind, setKind] = useState<FinanceKind>(entry?.kind ?? 'expense');
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [currency, setCurrency] = useState(entry?.currency ?? 'USD');
  const [date, setDate] = useState(
    entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [vendor, setVendor] = useState(entry?.vendor ?? '');
  const [note, setNote] = useState(entry?.note ?? '');
  // KEEP = mantener el existente (edición), null = sin/quitar, string = nueva key.
  const [receipt, setReceipt] = useState<string | null>(entry?.hasReceipt ? KEEP : null);
  const [submitting, setSubmitting] = useState(false);

  const { data: categories } = useFinanceCategories(kind);
  const cats = categories ?? [];
  const effectiveCategory = cats.some((c) => c.id === categoryId) ? categoryId : '';

  const amountNum = Number(amount);
  const valid = !!effectiveCategory && amount !== '' && amountNum > 0 && !!date;

  async function submit(): Promise<void> {
    if (!valid) return;
    setSubmitting(true);
    const base: Omit<FinanceEntryInput, 'receiptKey'> = {
      categoryId: effectiveCategory,
      amount: amountNum,
      currency,
      date: new Date(date).toISOString(),
      vendor: vendor.trim() || null,
      note: note.trim() || null,
    };
    try {
      if (entry) {
        // receipt === KEEP → no se manda (se mantiene); null o string → se actualiza.
        const input = receipt === KEEP ? base : { ...base, receiptKey: receipt };
        await update.mutateAsync({ id: entry.id, input });
        toast.success('Movimiento actualizado');
      } else {
        await create.mutateAsync({ ...base, receiptKey: receipt === KEEP ? null : receipt });
        toast.success('Movimiento creado');
      }
      router.push('/finance/movimientos');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el movimiento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-8"
        >
          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <WalletIcon className="text-primary size-4" />
              Movimiento
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  value={kind}
                  onValueChange={(v) => setKind(v as FinanceKind)}
                  disabled={!!entry}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{KIND_LABELS.expense}</SelectItem>
                    <SelectItem value="income">{KIND_LABELS.income}</SelectItem>
                  </SelectContent>
                </Select>
                {entry && <FieldDescription>No editable luego de crear.</FieldDescription>}
              </Field>
              <Field>
                <FieldLabel>Categoría</FieldLabel>
                <Select value={effectiveCategory || undefined} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>El tipo lo define la categoría.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="fe-amount">Monto</FieldLabel>
                <Input
                  id="fe-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Moneda</FieldLabel>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCE_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="fe-date">Fecha</FieldLabel>
                <DatePicker id="fe-date" value={date} onChange={setDate} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <FileTextIcon className="text-primary size-4" />
              Detalle
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fe-vendor">Proveedor / fuente</FieldLabel>
                <Input
                  id="fe-vendor"
                  value={vendor}
                  maxLength={200}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Comprobante</FieldLabel>
                <FinanceReceiptUpload value={receipt} onChange={setReceipt} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="fe-note">Nota</FieldLabel>
              <Textarea
                id="fe-note"
                value={note}
                maxLength={1000}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/finance/movimientos')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || submitting}>
              <SaveIcon className="size-4" />
              {submitting ? 'Guardando…' : entry ? 'Guardar cambios' : 'Crear movimiento'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
