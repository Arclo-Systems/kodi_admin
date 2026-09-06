'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { BellIcon, BellRingIcon, PlayIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { FINANCE_CURRENCIES } from '@/hooks/use-finance';
import {
  ALERT_KINDS,
  useFinanceAlertActions,
  useFinanceAlertRuleMutations,
  useFinanceAlertRules,
  useFinanceAlerts,
  type AlertEvaluation,
  type AlertKind,
  type FinanceAlertRule,
} from '@/hooks/use-finance-planning';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow } from '@/components/admin/empty-state';
import {
  ALERT_KIND_HINTS,
  ALERT_KIND_LABELS,
  THRESHOLD_UNIT_LABELS,
  formatMoney,
} from './finance-format';

const PAGE_SIZE = 20;

// Las dos reglas que miran plata necesitan moneda; la que cuenta órdenes la
// tiene prohibida (el backend responde 400 nombrando el campo). El formulario lo
// refleja escondiendo el selector: un valor que no se puede mandar no se pide.
const KINDS_CON_MONEDA: readonly AlertKind[] = ['RUNWAY_BELOW_MONTHS', 'BUDGET_OVERRUN_PERCENT'];

// Mismo criterio que el backend, incluido el CERO: "avisame si hay MÁS de 0
// órdenes sin asentar" es la regla que se quiere, no un umbral vacío.
const THRESHOLD_RE = /^\d{1,12}(\.\d{1,2})?$/;

const RuleSchema = z
  .object({
    kind: z.enum(ALERT_KINDS),
    threshold: z
      .string()
      .min(1, 'Requerido')
      .regex(THRESHOLD_RE, 'Hasta 12 enteros y 2 decimales, sin signo'),
    currency: z.enum(FINANCE_CURRENCIES).optional(),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (KINDS_CON_MONEDA.includes(values.kind) && !values.currency) {
      ctx.addIssue({
        code: 'custom',
        path: ['currency'],
        message: 'Esta regla mira plata: indicá en qué moneda.',
      });
    }
  });

type RuleForm = z.infer<typeof RuleSchema>;

/**
 * Alertas financieras: las reglas que se evalúan todos los días y lo que
 * dispararon.
 *
 * El canal principal es el panel —no hay correo a admins— así que lo que no se
 * ve acá no se ve en ningún lado. Por eso la evaluación muestra también las
 * reglas que NO pudieron decidir: una regla muda parece una regla tranquila.
 */
export function FinanceAlerts({ canWrite = false }: { canWrite?: boolean }) {
  const [onlyUnseen, setOnlyUnseen] = useState(true);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<FinanceAlertRule | null>(null);
  const [evaluation, setEvaluation] = useState<AlertEvaluation | null>(null);

  const rules = useFinanceAlertRules({ page: 1, pageSize: 100 });
  const alerts = useFinanceAlerts({
    acknowledged: onlyUnseen ? false : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { update, remove } = useFinanceAlertRuleMutations();
  const { acknowledge, evaluate } = useFinanceAlertActions();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="text-primary size-4" />
            Reglas
          </CardTitle>
          {canWrite && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon className="size-4" />
              Nueva regla
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {rules.isError && (
            <Alert variant="destructive" className="mb-3">
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>No se pudieron cargar las reglas.</span>
                <Button variant="outline" size="sm" onClick={() => void rules.refetch()}>
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Regla</TableHead>
                <TableHead className="w-40 text-right">Umbral</TableHead>
                <TableHead className="w-24">Moneda</TableHead>
                <TableHead className="w-28">Activa</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ) : rules.data && rules.data.items.length > 0 ? (
                rules.data.items.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <span className="font-medium">{ALERT_KIND_LABELS[rule.kind]}</span>
                      <p className="text-muted-foreground text-xs">{ALERT_KIND_HINTS[rule.kind]}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(rule.threshold)} {THRESHOLD_UNIT_LABELS[rule.thresholdUnit]}
                    </TableCell>
                    <TableCell>{rule.currency ?? '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.isActive}
                        disabled={!canWrite}
                        aria-label={`Activar ${ALERT_KIND_LABELS[rule.kind]}`}
                        onCheckedChange={(next) =>
                          void update
                            .mutateAsync({ id: rule.id, input: { isActive: next } })
                            .catch((e: unknown) =>
                              toast.error(
                                e instanceof Error ? e.message : 'No se pudo cambiar la regla',
                              ),
                            )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setToDelete(rule)}>
                          <Trash2Icon className="size-4" />
                          Borrar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmptyRow
                  colSpan={5}
                  icon={<BellIcon />}
                  message={rules.isError ? 'No se pudo cargar' : 'No hay reglas'}
                  description="Sin reglas no hay avisos: el panel no adivina qué umbral importa."
                />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <BellRingIcon className="text-primary size-4" />
            Alertas disparadas
          </CardTitle>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={onlyUnseen}
                onCheckedChange={(next) => {
                  setOnlyUnseen(next);
                  setPage(1);
                }}
                aria-label="Solo sin ver"
              />
              Solo sin ver
            </label>
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                disabled={evaluate.isPending}
                onClick={() =>
                  void evaluate
                    .mutateAsync()
                    .then((result) => setEvaluation(result ?? null))
                    .catch((e: unknown) =>
                      toast.error(e instanceof Error ? e.message : 'No se pudo evaluar'),
                    )
                }
              >
                <PlayIcon className="size-4" />
                {evaluate.isPending ? 'Evaluando…' : 'Evaluar ahora'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluation && <EvaluationSummary evaluation={evaluation} />}

          {alerts.isError && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>No se pudieron cargar las alertas.</span>
                <Button variant="outline" size="sm" onClick={() => void alerts.refetch()}>
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Día</TableHead>
                <TableHead>Qué pasó</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.isLoading ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ) : alerts.data && alerts.data.items.length > 0 ? (
                alerts.data.items.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="tabular-nums">{alert.firedOn}</TableCell>
                    <TableCell>
                      <span className="font-medium">{ALERT_KIND_LABELS[alert.kind]}</span>
                      <p className="text-muted-foreground text-sm">{alert.message}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {alert.acknowledgedAt ? (
                        <span className="text-muted-foreground text-xs">Vista</span>
                      ) : (
                        canWrite && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void acknowledge
                                .mutateAsync(alert.id)
                                .catch((e: unknown) =>
                                  toast.error(
                                    e instanceof Error ? e.message : 'No se pudo marcar la alerta',
                                  ),
                                )
                            }
                          >
                            Marcar como vista
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmptyRow
                  colSpan={3}
                  icon={<BellRingIcon />}
                  message={
                    alerts.isError
                      ? 'No se pudo cargar'
                      : onlyUnseen
                        ? 'No hay alertas sin ver'
                        : 'No hay alertas'
                  }
                  description="El evaluador corre todos los días a las 07:30 de Costa Rica. También se puede correr a mano."
                />
              )}
            </TableBody>
          </Table>

          {alerts.data && alerts.data.total > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * PAGE_SIZE >= alerts.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRuleDialog open={creating} onOpenChange={setCreating} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="¿Borrar la regla?"
        description="Se lleva también las alertas que ya disparó. Para conservar el historial, apagala con el interruptor en vez de borrarla."
        destructive
        confirmLabel="Borrar"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await remove.mutateAsync(toDelete.id);
            toast.success('Regla borrada.');
            setToDelete(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo borrar la regla');
          }
        }}
      />
    </div>
  );
}

/**
 * El resultado de una evaluación a mano.
 *
 * `skipped` no es un error: es una regla que no pudo decidir (por ejemplo, un
 * sobregiro sin presupuesto contra el cual medir). Si no se muestra, esa regla
 * queda muda para siempre y nadie se entera.
 */
function EvaluationSummary({ evaluation }: { evaluation: AlertEvaluation }) {
  return (
    <Alert>
      <AlertDescription className="space-y-1">
        <p>
          {evaluation.evaluated} regla(s) evaluadas el {evaluation.evaluatedOn}:{' '}
          {evaluation.fired} disparo(s) nuevo(s) y {evaluation.deduped} que ya tenían su alerta del
          día.
        </p>
        {evaluation.skipped.length > 0 && (
          <ul className="text-muted-foreground list-inside list-disc">
            {evaluation.skipped.map((s) => (
              <li key={s.ruleId}>
                {ALERT_KIND_LABELS[s.kind]}: {s.reason}
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}

function CreateRuleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create } = useFinanceAlertRuleMutations();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RuleForm>({
    resolver: zodResolver(RuleSchema),
    defaultValues: {
      kind: 'RUNWAY_BELOW_MONTHS',
      threshold: '',
      currency: FINANCE_CURRENCIES[0],
      isActive: true,
    },
  });

  // `useWatch` y no `watch()`: el segundo devuelve una función que el compilador
  // de React no puede memoizar, y el archivo entero se saltaría la compilación.
  const kind = useWatch({ control, name: 'kind' });
  const necesitaMoneda = KINDS_CON_MONEDA.includes(kind);

  async function submit(values: RuleForm): Promise<void> {
    try {
      await create.mutateAsync({
        kind: values.kind,
        threshold: values.threshold,
        // La moneda NO viaja donde está prohibida: mandarla sería un 400 con el
        // campo nombrado, y guardarla haría creer que la regla filtra por ella.
        ...(necesitaMoneda && values.currency ? { currency: values.currency } : {}),
        isActive: values.isActive,
      });
      toast.success('Regla creada.');
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo crear la regla');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva regla de alerta</DialogTitle>
          <DialogDescription>
            El tipo no se puede cambiar después: decide qué unidad es el umbral, y cambiarlo
            reinterpretaría el número guardado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <FieldGroup>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <Field data-invalid={!!errors.kind}>
                  <FieldLabel htmlFor="rule-kind">Tipo</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rule-kind" aria-label="Tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {ALERT_KIND_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>{ALERT_KIND_HINTS[field.value]}</FieldDescription>
                </Field>
              )}
            />

            <Field data-invalid={!!errors.threshold}>
              <FieldLabel htmlFor="rule-threshold">Umbral</FieldLabel>
              <Input
                id="rule-threshold"
                {...register('threshold')}
                inputMode="decimal"
                placeholder="6"
                aria-invalid={!!errors.threshold}
              />
              <FieldDescription>
                El cero es un umbral legítimo: &quot;más de 0 órdenes sin asentar&quot; es
                exactamente la regla que se quiere.
              </FieldDescription>
              {errors.threshold && <FieldError>{errors.threshold.message}</FieldError>}
            </Field>

            {necesitaMoneda && (
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Field data-invalid={!!errors.currency}>
                    <FieldLabel htmlFor="rule-currency">Moneda</FieldLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="rule-currency" aria-label="Moneda">
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
                    {errors.currency && <FieldError>{errors.currency.message}</FieldError>}
                  </Field>
                )}
              />
            )}

            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch
                    id="rule-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Activa"
                  />
                  <FieldLabel htmlFor="rule-active">Activa</FieldLabel>
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando…' : 'Crear regla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
