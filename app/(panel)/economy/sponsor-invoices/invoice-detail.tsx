'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  BanIcon,
  CircleCheckIcon,
  CoinsIcon,
  EyeIcon,
  FileTextIcon,
  ListIcon,
  PercentIcon,
  PlusIcon,
  ReceiptIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  useInvoice,
  useInvoiceActions,
  useInvoiceMutations,
  INVOICE_STATUS_LABELS,
  type InvoiceDetail as TInvoiceDetail,
} from '@/hooks/use-sponsor-invoices';
import { KpiCard } from '@/components/admin/kpi-card';
import { openSignedAsset } from '@/lib/signed-asset';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/lib/status-badge';
import { INVOICE_STATUS_FARO } from '@/lib/invoice-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Skeleton } from '@/components/ui/skeleton';

const money = (n: number, currency: string) =>
  `${currency === 'USD' ? '$' : '₡'}${n.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;

function BackLink() {
  return (
    <Link
      href="/economy/sponsors"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon className="size-3" />
      Sponsors
    </Link>
  );
}

export function InvoiceDetailView({ id }: { id: string }) {
  const { data: inv, isLoading } = useInvoice(id);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!inv) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">No se encontró la factura.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackLink />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Factura {inv.number}</h1>
          <StatusBadge
            tone={INVOICE_STATUS_FARO[inv.status].tone}
            icon={INVOICE_STATUS_FARO[inv.status].icon}
            label={INVOICE_STATUS_LABELS[inv.status]}
          />
        </div>
        <p className="text-muted-foreground">
          {inv.sponsor?.name ?? 'Sponsor'} · vence {new Date(inv.dueDate).toLocaleDateString('es-CR')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Subtotal"
          value={money(inv.subtotal, inv.currency)}
          icon={<CoinsIcon />}
          tone="teal"
        />
        <KpiCard
          label={`IVA${inv.appliesIva ? '' : ' (n/a)'}`}
          value={money(inv.ivaAmount, inv.currency)}
          icon={<PercentIcon />}
          tone="blue"
        />
        <KpiCard
          label="Total"
          value={money(inv.total, inv.currency)}
          icon={<ReceiptIcon />}
          tone="amber"
        />
      </div>

      <InvoiceActions invoice={inv} />

      {inv.status === 'draft' ? (
        <DraftLineEditor invoice={inv} />
      ) : (
        <ReadOnlyLines invoice={inv} />
      )}
    </div>
  );
}

function InvoiceActions({ invoice }: { invoice: TInvoiceDetail }) {
  const { issue, pay, voidInvoice, pdf } = useInvoiceActions(invoice.id);
  const [confirm, setConfirm] = useState<'issue' | 'pay' | 'void' | null>(null);

  const run = async (): Promise<void> => {
    if (confirm === 'issue') {
      await issue.mutateAsync();
      toast.success('Factura emitida');
    } else if (confirm === 'pay') {
      await pay.mutateAsync();
      toast.success('Factura marcada como pagada');
    } else if (confirm === 'void') {
      await voidInvoice.mutateAsync();
      toast.success('Factura anulada');
    }
  };

  async function generatePdf(): Promise<void> {
    try {
      await pdf.mutateAsync();
      toast.success('PDF generado'); // se abre con "Ver PDF" (enlace firmado)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error generando el PDF');
    }
  }

  function viewPdf(): void {
    openSignedAsset(`/api/admin/economy/sponsor-invoices/${invoice.id}/pdf-url`).catch((e) =>
      toast.error(e instanceof Error ? e.message : 'No se pudo abrir el PDF'),
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {invoice.status === 'draft' && (
        <Button size="sm" onClick={() => setConfirm('issue')}>
          <SendIcon className="size-4" />
          Emitir
        </Button>
      )}
      {invoice.status === 'issued' && (
        <Button size="sm" onClick={() => setConfirm('pay')}>
          <CircleCheckIcon className="size-4" />
          Marcar pagada
        </Button>
      )}
      {(invoice.status === 'draft' || invoice.status === 'issued') && (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirm('void')}
        >
          <BanIcon className="size-4" />
          Anular
        </Button>
      )}
      {invoice.status !== 'void' && (
        <Button size="sm" variant="outline" onClick={generatePdf} disabled={pdf.isPending}>
          <FileTextIcon className="size-4" />
          {invoice.pdfUrl ? 'Regenerar PDF' : 'Generar PDF'}
        </Button>
      )}
      {invoice.pdfUrl && (
        <Button size="sm" variant="ghost" onClick={viewPdf}>
          <EyeIcon className="size-4" />
          Ver PDF
        </Button>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm === 'issue' ? 'Emitir factura' : confirm === 'pay' ? 'Marcar pagada' : 'Anular factura'
        }
        description={
          confirm === 'void'
            ? 'La factura quedará anulada y no se podrá editar.'
            : confirm === 'issue'
              ? 'Una vez emitida no se pueden editar las líneas.'
              : 'Confirmá el pago de la factura.'
        }
        destructive={confirm === 'void'}
        confirmLabel={confirm === 'issue' ? 'Emitir' : confirm === 'pay' ? 'Marcar pagada' : 'Anular'}
        onConfirm={run}
      />
    </div>
  );
}

function ReadOnlyLines({ invoice }: { invoice: TInvoiceDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListIcon className="text-primary size-4" />
          Líneas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="p-2 font-medium">Descripción</th>
                <th className="p-2 font-medium">Origen</th>
                <th className="p-2 text-right font-medium">Cant.</th>
                <th className="p-2 text-right font-medium">Precio</th>
                <th className="p-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.items.map((it) => (
                <tr key={it.id}>
                  <td className="p-2">{it.description}</td>
                  <td className="p-2">
                    <Badge variant="outline">{it.sourceType}</Badge>
                  </td>
                  <td className="p-2 text-right">{it.quantity}</td>
                  <td className="p-2 text-right">{money(it.unitPrice, invoice.currency)}</td>
                  <td className="p-2 text-right">{money(it.lineTotal, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {invoice.notes && <p className="text-muted-foreground mt-3 text-sm">{invoice.notes}</p>}
      </CardContent>
    </Card>
  );
}

type EditorValues = {
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  notes: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    sourceType: string;
    sourceId: string | null;
    cabysCode: string;
  }[];
};

function DraftLineEditor({ invoice }: { invoice: TInvoiceDetail }) {
  const { updateDraft } = useInvoiceMutations();
  const form = useForm<EditorValues>({
    defaultValues: {
      dueDate: invoice.dueDate.slice(0, 10),
      periodStart: invoice.periodStart ? invoice.periodStart.slice(0, 10) : '',
      periodEnd: invoice.periodEnd ? invoice.periodEnd.slice(0, 10) : '',
      notes: invoice.notes ?? '',
      items: invoice.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        sourceType: it.sourceType,
        sourceId: it.sourceId,
        cabysCode: it.cabysCode ?? '',
      })),
    },
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  const periodStart = useWatch({ control: form.control, name: 'periodStart' });
  const periodEnd = useWatch({ control: form.control, name: 'periodEnd' });

  async function save(v: EditorValues): Promise<void> {
    if (v.items.length === 0) {
      toast.error('La factura debe tener al menos una línea.');
      return;
    }
    try {
      await updateDraft.mutateAsync({
        id: invoice.id,
        input: {
          dueDate: new Date(`${v.dueDate}T00:00:00.000Z`).toISOString(),
          periodStart: v.periodStart ? new Date(`${v.periodStart}T00:00:00.000Z`).toISOString() : null,
          periodEnd: v.periodEnd ? new Date(`${v.periodEnd}T00:00:00.000Z`).toISOString() : null,
          notes: v.notes.trim() || null,
          items: v.items.map((it) => ({
            description: it.description.trim(),
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            sourceType: it.sourceType || 'manual',
            sourceId: it.sourceId,
            cabysCode: it.cabysCode.trim() || undefined,
          })),
        },
      });
      toast.success('Borrador actualizado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando el borrador');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(save)}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ListIcon className="text-primary size-4" />
            Líneas (borrador)
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              items.append({
                description: '',
                quantity: 1,
                unitPrice: 0,
                sourceType: 'manual',
                sourceId: null,
                cabysCode: '',
              })
            }
          >
            <PlusIcon className="size-4" />
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {items.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 items-center gap-2">
                <Controller
                  name={`items.${i}.description`}
                  control={form.control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Input {...field} className="col-span-5" placeholder="Descripción" />
                  )}
                />
                <Badge variant="outline" className="col-span-2 justify-center">
                  {form.watch(`items.${i}.sourceType`)}
                </Badge>
                <Controller
                  name={`items.${i}.quantity`}
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      className="col-span-1"
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
                  name={`items.${i}.unitPrice`}
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
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              name="dueDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} aria-label="Vencimiento" />
              )}
            />
            <div className="sm:col-span-2">
              <DateRangePicker
                from={periodStart}
                to={periodEnd}
                onChange={(f, t) => {
                  form.setValue('periodStart', f);
                  form.setValue('periodEnd', t);
                }}
                placeholder="Período facturado"
                aria-label="Período facturado"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SaveIcon className="size-4" />
              Guardar borrador
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
