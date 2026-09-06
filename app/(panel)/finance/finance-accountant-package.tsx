'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, PackageIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { FINANCE_CURRENCIES } from '@/hooks/use-finance';
import {
  fetchPackageFileUrl,
  useAccountantPackageMutations,
  useAccountantPackages,
  type AccountantPackage,
  type PackageFile,
} from '@/hooks/use-finance-tax';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { StatusBadge } from '@/lib/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MONTH_OPTIONS,
  PACKAGE_FILE_LABELS,
  PACKAGE_STATUS_BADGE,
  PACKAGE_STATUS_LABELS,
  formatBytes,
  monthName,
} from './finance-format';

/** El mes anterior al corriente: es el que se le manda al contador. */
function previousMonth(): { year: number; month: number } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Paquete del contador: el juego contable completo de un mes, en PDF y CSV.
 *
 * Regenerar **crea una versión nueva y nunca pisa la anterior**: la v1 puede
 * haberse mandado ya, y reescribirla dejaría al contador con un archivo distinto
 * del que tiene en la mano.
 */
export function FinanceAccountantPackage({ canWrite = false }: { canWrite?: boolean }) {
  const initial = useMemo(() => previousMonth(), []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [currency, setCurrency] = useState<(typeof FINANCE_CURRENCIES)[number]>('CRC');
  const [toDiscard, setToDiscard] = useState<AccountantPackage | null>(null);

  const query = { year, month, currency };
  const { data, isLoading, isError, error, refetch } = useAccountantPackages(query);
  const { generate, discard } = useAccountantPackageMutations();

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  const versions = data ?? [];
  const generating = versions.some((p) => p.status === 'GENERATING');

  async function generatePackage(): Promise<void> {
    try {
      await generate.mutateAsync(query);
      toast.success('Paquete generado');
    } catch (e) {
      // El 413 `PACKAGE_TOO_LARGE` y el 409 de carrera dicen qué hacer (partir el
      // mes, reintentar): el `message` del backend es la instrucción.
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el paquete');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generar un paquete</CardTitle>
          <CardDescription>
            Portada, plan de cuentas con saldos, balance de comprobación, balance general, estado de
            resultados, tipos de cambio del mes, el mayor cuenta por cuenta y la declaración de IVA
            si existe. Es un documento de trabajo, no un comprobante autorizado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field className="w-32">
            <FieldLabel htmlFor="pkg-year">Año</FieldLabel>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger id="pkg-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="w-40">
            <FieldLabel htmlFor="pkg-month">Mes</FieldLabel>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger id="pkg-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="w-32">
            <FieldLabel htmlFor="pkg-currency">Moneda</FieldLabel>
            <Select value={currency} onValueChange={(v) => setCurrency(v as (typeof FINANCE_CURRENCIES)[number])}>
              <SelectTrigger id="pkg-currency">
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
          {canWrite && (
            <Button
              type="button"
              disabled={generate.isPending || generating}
              onClick={() => void generatePackage()}
            >
              <RefreshCwIcon className="size-4" />
              {generate.isPending ? 'Generando…' : 'Generar paquete'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cada moneda tiene su propio paquete: consolidar un mes ya cerrado con la
          tasa de hoy inventaría cifras que nadie asentó. */}
      <p className="text-muted-foreground text-sm">
        Versiones de {monthName(month)} {year} en {currency}. Cada moneda lleva su paquete aparte.
      </p>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'No se pudieron cargar las versiones.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : versions.length === 0 && !isError ? (
        <EmptyState
          icon={<PackageIcon />}
          message="Todavía no hay ningún paquete de este mes"
          description="Generalo cuando el período esté cerrado: sobre un mes abierto, las cifras todavía se pueden mover."
        />
      ) : (
        <ul className="space-y-3">
          {versions.map((pkg) => (
            <li key={pkg.id}>
              <PackageVersion
                pkg={pkg}
                canWrite={canWrite}
                onDiscard={() => setToDiscard(pkg)}
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDiscard}
        onOpenChange={(open) => !open && setToDiscard(null)}
        title="Descartar la versión"
        description={
          toDiscard
            ? `La versión ${toDiscard.version} queda marcada como descartada. El número no se reusa: la próxima generación toma el siguiente.`
            : undefined
        }
        destructive
        confirmLabel="Descartar"
        onConfirm={async () => {
          if (!toDiscard) return;
          await discard.mutateAsync(toDiscard.id);
          toast.success('Versión descartada');
          setToDiscard(null);
        }}
      />
    </div>
  );
}

function PackageVersion({
  pkg,
  canWrite,
  onDiscard,
}: {
  pkg: AccountantPackage;
  canWrite: boolean;
  onDiscard: () => void;
}) {
  const badge = PACKAGE_STATUS_BADGE[pkg.status];
  // Solo una reserva colgada o una que falló se descarta: una versión READY es el
  // respaldo de lo que se le entregó al contador.
  const discardable = pkg.status === 'GENERATING' || pkg.status === 'FAILED';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base">Versión {pkg.version}</CardTitle>
          <StatusBadge
            tone={badge.tone}
            icon={badge.icon}
            label={PACKAGE_STATUS_LABELS[pkg.status]}
          />
        </div>
        <CardDescription>
          Generado el {new Date(pkg.generatedAt).toLocaleString('es-CR')}
          {pkg.generatedBy && <span className="ml-2 font-mono break-all">{pkg.generatedBy}</span>}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {pkg.status === 'GENERATING' && (
          <p className="text-muted-foreground text-sm" role="status">
            Se está armando. La lista se actualiza sola cuando termine.
          </p>
        )}

        {pkg.status === 'FAILED' && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo generar</AlertTitle>
            <AlertDescription>
              {pkg.error ?? 'El backend no dejó un motivo. Volvé a generarlo.'}
            </AlertDescription>
          </Alert>
        )}

        {pkg.status === 'DISCARDED' && (
          <p className="text-muted-foreground text-sm">
            Descartada. Los archivos ya no están disponibles.
          </p>
        )}

        {pkg.metadata && (
          <p className="text-muted-foreground text-sm">
            {pkg.metadata.pdfPages} páginas · {pkg.metadata.ledgerRows} líneas de mayor ·{' '}
            {pkg.metadata.balanced ? 'la comprobación cuadra' : 'la comprobación NO cuadra'}
          </p>
        )}

        {pkg.status === 'READY' && (
          <div className="flex flex-wrap gap-2">
            {pkg.files.map((file) => (
              <PackageFileButton
                key={file}
                id={pkg.id}
                file={file}
                bytes={pkg.metadata?.bytes[file]}
              />
            ))}
          </div>
        )}

        {canWrite && discardable && (
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            <Trash2Icon className="size-4" />
            Descartar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Un archivo del paquete.
 *
 * El objeto vive en R2 privado: primero se pide el enlace firmado (TTL 300 s) y
 * recién después se navega a él. No se usa un `<a href>` fijo porque la URL no
 * existe hasta que se pide, y porque un 409 `PACKAGE_NOT_READY` o un 404 tienen
 * que verse como mensaje y no bajarse al disco con extensión `.pdf`.
 */
function PackageFileButton({
  id,
  file,
  bytes,
}: {
  id: string;
  file: PackageFile;
  bytes?: number;
}) {
  const [pending, setPending] = useState(false);

  async function download(): Promise<void> {
    setPending(true);
    try {
      const signed = await fetchPackageFileUrl(id, file);
      window.open(signed.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo abrir el archivo');
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => void download()}
    >
      <DownloadIcon className="size-4" />
      {PACKAGE_FILE_LABELS[file]}
      {bytes !== undefined && (
        <span className="text-muted-foreground ml-1 text-xs">{formatBytes(bytes)}</span>
      )}
    </Button>
  );
}
