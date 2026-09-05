'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpenIcon } from 'lucide-react';
import {
  ACCOUNT_TYPES,
  FINANCE_CURRENCIES,
  useFinanceAccounts,
  useFinanceLedger,
  type AccountType,
  type LedgerLine,
} from '@/hooks/use-finance';
import { DataTable } from '@/components/admin/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { civilDayEndIso, civilDayStartIso } from '@/lib/civil-date';
import { ACCOUNT_TYPE_LABELS, JOURNAL_STATUS_LABELS, formatMoney } from './finance-format';
import { FinanceReportCsvButton } from './finance-report-csv-button';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

export function FinanceLedger() {
  const [accountId, setAccountId] = useState('');
  // La moneda no tiene "todas": un saldo corrido que mezcla colones con dólares no
  // es un saldo. Arranca en la que se usa a diario.
  const [currency, setCurrency] = useState<string>(FINANCE_CURRENCIES[0]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const accountsQuery = useFinanceAccounts();
  const params = {
    accountId,
    currency,
    from: from ? civilDayStartIso(from) : undefined,
    to: to ? civilDayEndIso(to) : undefined,
  };
  const { data: ledger, isLoading, isError, error } = useFinanceLedger({ ...params, page, pageSize });

  // Un plan de cuentas se lee por clase: 37 cuentas en una lista plana obligan a
  // recordar qué significa el primer dígito del código.
  const groups = useMemo(() => {
    const byType = new Map<AccountType, { id: string; label: string }[]>();
    for (const account of accountsQuery.data ?? []) {
      const list = byType.get(account.type) ?? [];
      list.push({ id: account.id, label: `${account.code} ${account.name}` });
      byType.set(account.type, list);
    }
    return ACCOUNT_TYPES.filter((type) => byType.has(type)).map((type) => ({
      type,
      accounts: byType.get(type) ?? [],
    }));
  }, [accountsQuery.data]);

  const columns = useMemo<ColumnDef<LedgerLine, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Fecha',
        meta: { label: 'Fecha' },
        enableSorting: false,
        cell: ({ row }) => fmtDate(row.original.date),
      },
      {
        accessorKey: 'entryNumber',
        header: 'Asiento',
        meta: { label: 'Asiento' },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="tabular-nums">{row.original.entryNumber}</span>
            {/* Un asiento reversado sigue sumando en el mayor (él y su reverso se
                cancelan): el estado explica la línea, no la excluye. */}
            {row.original.entryStatus !== 'POSTED' && (
              <span className="text-muted-foreground text-xs">
                {JOURNAL_STATUS_LABELS[row.original.entryStatus]}
              </span>
            )}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Descripción',
        meta: { label: 'Descripción' },
        enableSorting: false,
      },
      {
        accessorKey: 'debit',
        header: 'Débito',
        meta: { label: 'Débito' },
        enableSorting: false,
        cell: ({ row }) => <Money value={row.original.debit} />,
      },
      {
        accessorKey: 'credit',
        header: 'Crédito',
        meta: { label: 'Crédito' },
        enableSorting: false,
        cell: ({ row }) => <Money value={row.original.credit} />,
      },
      {
        accessorKey: 'runningBalance',
        header: 'Saldo',
        meta: { label: 'Saldo' },
        enableSorting: false,
        cell: ({ row }) => <Money value={row.original.runningBalance} strong />,
      },
    ],
    [],
  );

  const reset = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={accountId}
          onValueChange={(v) => {
            setAccountId(v);
            reset();
          }}
          disabled={!accountsQuery.isSuccess}
        >
          <SelectTrigger className="w-full sm:w-96" size="sm" aria-label="Cuenta">
            <SelectValue
              placeholder={accountsQuery.isLoading ? 'Cargando cuentas…' : 'Elegí una cuenta'}
            />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group.type}>
                <SelectLabel>{ACCOUNT_TYPE_LABELS[group.type]}</SelectLabel>
                {group.accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={currency}
          onValueChange={(v) => {
            setCurrency(v);
            reset();
          }}
        >
          <SelectTrigger className="w-28" size="sm" aria-label="Moneda">
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
        <DateRangePicker
          from={from}
          to={to}
          onChange={(f, t) => {
            setFrom(f);
            setTo(t);
            reset();
          }}
          placeholder="Últimos 12 meses"
          aria-label="Rango de fechas"
          className="w-auto"
        />
        {/* Sin cuenta elegida no hay mayor que bajar: el backend respondería 400. */}
        {accountId && (
          <FinanceReportCsvButton report="ledger" params={params} className="ml-auto" />
        )}
      </div>

      {accountsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>No se pudo cargar el plan de cuentas.</span>
            <Button variant="outline" size="sm" onClick={() => void accountsQuery.refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'No se pudo cargar el libro mayor.'}
          </AlertDescription>
        </Alert>
      )}

      {!accountId ? (
        <Card>
          <CardContent className="text-muted-foreground py-14 text-center text-sm">
            Elegí una cuenta y una moneda para ver su libro mayor.
          </CardContent>
        </Card>
      ) : (
        <>
          {ledger && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">
                    {ledger.account.code} {ledger.account.name}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {ACCOUNT_TYPE_LABELS[ledger.account.type]} · {ledger.currency}
                  </p>
                </div>
                <div className="flex gap-8">
                  <Balance label="Saldo inicial" value={ledger.openingBalance} />
                  {/* Del rango completo, no de la página: el corrido de la última
                      línea de la última página tiene que dar exactamente esto. */}
                  <Balance label="Saldo final" value={ledger.closingBalance} strong />
                </div>
              </CardContent>
            </Card>
          )}

          <DataTable
            columns={columns}
            data={ledger?.lines ?? []}
            total={ledger?.total ?? 0}
            page={page}
            pageSize={pageSize}
            loading={isLoading}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            emptyIcon={<BookOpenIcon />}
            emptyMessage="Todavía no hay asientos en esta cuenta para el período"
            emptyDescription="Probá con otro rango de fechas u otra moneda, o cargá el movimiento desde Movimientos."
          />
        </>
      )}
    </div>
  );
}

function Money({ value, strong }: { value: string; strong?: boolean }) {
  return (
    <span className={strong ? 'font-semibold tabular-nums' : 'tabular-nums'}>
      {formatMoney(value)}
    </span>
  );
}

function Balance({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={strong ? 'text-lg font-semibold tabular-nums' : 'text-lg tabular-nums'}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
