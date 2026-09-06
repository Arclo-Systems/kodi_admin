'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CopyIcon, SaveIcon, TriangleAlertIcon } from 'lucide-react';
import { useFinanceAccounts, type FinanceAccount } from '@/hooks/use-finance';
import {
  RESULT_ACCOUNT_TYPES,
  useBudget,
  useBudgetMutations,
  useBudgets,
  type BudgetDetail,
  type ResultAccountType,
} from '@/hooks/use-finance-planning';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ACCOUNT_TYPE_LABELS, formatAmount, formatPeriod, sumMoney } from './finance-format';

// El mismo criterio que `zMoney()` en el backend: hasta 12 enteros, 2 decimales,
// sin signo. El CERO se admite desde la Fase 5 —el CHECK de la base es
// `>= 0`— y no es lo mismo que dejarlo vacío: presupuestar cero dice que esa
// cuenta no debía gastar nada, y la variación lo marca como `PRESUPUESTO_EN_CERO`;
// dejarlo vacío la saca del presupuesto y la fila aparece "sin presupuestar".
const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;

const LinesSchema = z.object({
  amounts: z.record(
    z.string(),
    z
      .string()
      .refine(
        (v) => v === '' || AMOUNT_RE.test(v),
        'Monto inválido: hasta 2 decimales y sin signo. Dejalo vacío para no presupuestar la cuenta.',
      ),
  ),
});

type LinesForm = z.infer<typeof LinesSchema>;

/**
 * Las cuentas sobre las que se puede presupuestar: hojas de resultado activas.
 *
 * Una cuenta con hijas no entra porque su saldo YA es el subtotal de la rama —
 * presupuestarla además de sus hijas contaría la misma plata dos veces, y el
 * backend responde 409 `BUDGET_ACCOUNT_IS_PARENT`.
 */
export function budgetableAccounts(accounts: FinanceAccount[]): FinanceAccount[] {
  const parents = new Set(accounts.map((a) => a.parentId).filter((id): id is string => !!id));
  return accounts
    .filter(
      (a) =>
        a.isActive &&
        !parents.has(a.id) &&
        (RESULT_ACCOUNT_TYPES as readonly string[]).includes(a.type),
    )
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Editor de las líneas de un presupuesto.
 *
 * Guardar es un `PUT` de reemplazo TOTAL, no un parche: con altas y bajas
 * sueltas, reordenar el presupuesto pasa por instantes en los que una cuenta ya
 * no está y su reemplazo todavía no, y la variación consultada ahí muestra un
 * sobregiro que nunca existió.
 */
export function FinanceBudgetLinesDialog({
  budgetId,
  onOpenChange,
}: {
  budgetId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: budget, isLoading, isError } = useBudget(budgetId ?? undefined);
  const { data: accounts } = useFinanceAccounts();

  return (
    <Dialog open={!!budgetId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {budget ? `${budget.name} · ${formatPeriod(budget.period)}` : 'Presupuesto'}
          </DialogTitle>
          <DialogDescription>
            Un monto por cuenta de resultado. Lo que se guarda reemplaza al presupuesto entero: las
            cuentas que dejes vacías salen de la lista.
          </DialogDescription>
        </DialogHeader>

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>No se pudo cargar el presupuesto.</AlertDescription>
          </Alert>
        )}

        {isLoading || !budget || !accounts ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          // `key`: al copiar de otro presupuesto el detalle cambia entero, y el
          // formulario tiene que renacer con los montos nuevos en vez de
          // quedarse con lo que había tecleado.
          <LinesEditor
            key={budget.updatedAt}
            budget={budget}
            accounts={budgetableAccounts(accounts)}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LinesEditor({
  budget,
  accounts,
  onSaved,
}: {
  budget: BudgetDetail;
  accounts: FinanceAccount[];
  onSaved: () => void;
}) {
  const { replaceLines, copyFrom } = useBudgetMutations();
  const [source, setSource] = useState<string>('');

  const saved = useMemo(
    () => new Map(budget.lines.map((line) => [line.accountId, line.amount])),
    [budget.lines],
  );

  // Las líneas guardadas sobre cuentas que YA NO son presupuestables (la
  // retiraron, o le colgaron hijas después de presupuestarla). No entran al
  // formulario —el backend las rechazaría— pero tampoco pueden desaparecer en
  // silencio: el `PUT` es un reemplazo total y guardar las borra.
  const orphans = useMemo(
    () => budget.lines.filter((line) => !accounts.some((a) => a.id === line.accountId)),
    [budget.lines, accounts],
  );

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LinesForm>({
    resolver: zodResolver(LinesSchema),
    defaultValues: {
      amounts: Object.fromEntries(accounts.map((a) => [a.id, saved.get(a.id) ?? ''])),
    },
  });

  // El subtotal por clase se calcula con lo TECLEADO, no con `totalsByType`, que
  // es el del presupuesto guardado: mientras se edita, repetirlo diría que el
  // total no se movió. `useWatch` y no `watch()` — el segundo devuelve una
  // función que el compilador de React no puede memoizar.
  const amounts = useWatch({ control, name: 'amounts' });

  const archived = budget.status === 'ARCHIVED';

  async function save(values: LinesForm): Promise<void> {
    const lines = Object.entries(values.amounts)
      .filter(([, amount]) => amount !== '')
      // El monto viaja TAL CUAL se tecleó: pasarlo por `Number` para
      // "normalizarlo" reintroduce el double en el borde que el string evita.
      .map(([accountId, amount]) => ({ accountId, amount }));
    try {
      await replaceLines.mutateAsync({ id: budget.id, lines });
      toast.success(`Presupuesto guardado: ${lines.length} línea(s).`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el presupuesto');
    }
  }

  return (
    <form onSubmit={handleSubmit(save)} className="space-y-4">
      <CopyFromRow
        budgetId={budget.id}
        currency={budget.currency}
        value={source}
        onChange={setSource}
        disabled={archived}
        onCopy={async () => {
          try {
            await copyFrom.mutateAsync({ id: budget.id, sourceId: source });
            toast.success('Líneas copiadas. Revisá los montos antes de guardar.');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo copiar el presupuesto');
          }
        }}
      />

      {archived && (
        <Alert>
          <AlertDescription>
            Este presupuesto está archivado: no acepta cambios. Desarchivalo desde la lista para
            volver a editarlo.
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Código</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead className="w-44 text-right">Monto ({budget.currency})</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {RESULT_ACCOUNT_TYPES.map((type) => {
            const ofType = accounts.filter((a) => a.type === type);
            if (ofType.length === 0) return null;
            return (
              <TypeSection
                key={type}
                type={type}
                accounts={ofType}
                subtotal={sumMoney(ofType.map((a) => amounts?.[a.id] ?? ''))}
                currency={budget.currency}
                disabled={archived}
                register={register}
                errors={errors}
              />
            );
          })}
        </TableBody>
      </Table>

      {orphans.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Cuentas que ya no se pueden presupuestar</p>
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>
              Las retiraron o les colgaron subcuentas después de presupuestarlas. No se pueden
              editar y <strong>al guardar se quitan del presupuesto</strong>. Si querés
              conservarlas, reactivá la cuenta antes de guardar.
            </AlertDescription>
          </Alert>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="w-44 text-right">Monto guardado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orphans.map((line) => (
                <TableRow key={line.accountId} className="text-muted-foreground">
                  <TableCell className="tabular-nums">{line.code}</TableCell>
                  <TableCell>{line.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmount(line.amount, budget.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || archived}>
          <SaveIcon className="size-4" />
          {isSubmitting ? 'Guardando…' : 'Guardar presupuesto'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function TypeSection({
  type,
  accounts,
  subtotal,
  currency,
  disabled,
  register,
  errors,
}: {
  type: ResultAccountType;
  accounts: FinanceAccount[];
  /** `null` = hay un monto a medio escribir; sumar el resto daría un total falso. */
  subtotal: string | null;
  currency: string;
  disabled: boolean;
  register: ReturnType<typeof useForm<LinesForm>>['register'];
  errors: ReturnType<typeof useForm<LinesForm>>['formState']['errors'];
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={2} className="font-semibold">
          {ACCOUNT_TYPE_LABELS[type]}
        </TableCell>
        <TableCell className="text-right font-semibold tabular-nums">
          {subtotal === null ? (
            <span className="text-destructive font-normal">Revisá los montos</span>
          ) : (
            formatAmount(subtotal, currency)
          )}
        </TableCell>
      </TableRow>
      {accounts.map((account) => {
        const error = errors.amounts?.[account.id]?.message;
        return (
          <TableRow key={account.id}>
            <TableCell className="text-muted-foreground tabular-nums">{account.code}</TableCell>
            <TableCell>{account.name}</TableCell>
            <TableCell>
              <Field data-invalid={!!error}>
                <Input
                  {...register(`amounts.${account.id}`)}
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={disabled}
                  aria-invalid={!!error}
                  aria-label={`Monto de ${account.code} ${account.name}`}
                  className="text-right tabular-nums"
                />
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

/**
 * "Copiar de…": el atajo para armar el mes que viene sobre el que ya se armó.
 *
 * Solo se ofrecen presupuestos de la MISMA moneda: el backend responde 409
 * `BUDGET_CURRENCY_MISMATCH` porque copiar montos en colones a un presupuesto en
 * dólares no es una conversión, es un error de tipeo multiplicado por 500.
 */
function CopyFromRow({
  budgetId,
  currency,
  value,
  onChange,
  onCopy,
  disabled,
}: {
  budgetId: string;
  currency: string;
  value: string;
  onChange: (value: string) => void;
  onCopy: () => Promise<void>;
  disabled: boolean;
}) {
  const { data } = useBudgets({ currency, page: 1, pageSize: 100 });
  const sources = (data?.items ?? []).filter((b) => b.id !== budgetId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={onChange} disabled={disabled || sources.length === 0}>
        <SelectTrigger className="w-64" size="sm" aria-label="Copiar de">
          <SelectValue placeholder="Copiar de…" />
        </SelectTrigger>
        <SelectContent>
          {sources.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {formatPeriod(b.period)} · {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !value}
        onClick={() => void onCopy()}
      >
        <CopyIcon className="size-4" />
        Copiar líneas
      </Button>
      <span className="text-muted-foreground text-xs">
        Reemplaza las líneas de este presupuesto por las del elegido.
      </span>
    </div>
  );
}
