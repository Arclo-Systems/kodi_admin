'use client';

import { useEffect, useState } from 'react';
import { BanIcon, CalendarPlusIcon, CircleCheckIcon, GiftIcon, SaveIcon, SlidersHorizontalIcon } from 'lucide-react';
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
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/lib/status-badge';
import { SUBSCRIPTION_STATUS, subscriptionStatusLabel } from '@/lib/subscription-status';
import { PlanBadge, planLabel } from '@/lib/plans';
import { useUsers } from '@/hooks/use-users';
import { useModulesTree } from '@/hooks/use-modules-tree';
import {
  useSubscriptions,
  useSubscriptionMutations,
  type Subscription,
  type GrantInput,
} from '@/hooks/use-subscriptions';

const PLANS = ['free', 'basico', 'plus', 'pro'] as const;
const PERIODS = ['monthly', 'quarterly', 'yearly'] as const;
const STATUSES = ['trial', 'active', 'cancelled', 'expired', 'grace'] as const;
const PERIOD_LABELS: Record<string, string> = { monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' };
const ALL = 'all';
const PAGE_SIZE = 20;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

export function SubscriptionsTable() {
  const [plan, setPlan] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [friendCode, setFriendCode] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSubscriptions({
    page,
    pageSize: PAGE_SIZE,
    plan: plan === ALL ? undefined : plan,
    status: status === ALL ? undefined : status,
    friendCode: friendCode.trim() || undefined,
  });
  const { grant, extend, cancel, changeStatus } = useSubscriptionMutations();

  const [grantOpen, setGrantOpen] = useState(false);
  const [extendTarget, setExtendTarget] = useState<Subscription | null>(null);
  const [statusTarget, setStatusTarget] = useState<Subscription | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);

  const resetPage = () => setPage(1);

  const columns: ColumnDef<Subscription, unknown>[] = [
    {
      id: 'user',
      header: 'Usuario',
      meta: { label: 'Usuario' },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user.displayName}</div>
          <div className="text-muted-foreground text-xs">
            {row.original.user.email} · {row.original.user.country}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'plan',
      header: 'Plan',
      meta: { label: 'Plan' },
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5">
          <PlanBadge plan={row.original.plan} />
          {row.original.isComp && <span className="text-muted-foreground text-xs">(comp)</span>}
        </span>
      ),
    },
    {
      accessorKey: 'period',
      header: 'Período',
      meta: { label: 'Período' },
      cell: ({ row }) => PERIOD_LABELS[row.original.period] ?? row.original.period,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      meta: { label: 'Estado' },
      cell: ({ row }) => {
        const st = SUBSCRIPTION_STATUS[row.original.status];
        return st ? (
          <StatusBadge tone={st.tone} icon={st.icon} label={st.label} />
        ) : (
          <span className="text-muted-foreground">{row.original.status}</span>
        );
      },
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expira',
      meta: { label: 'Expira' },
      cell: ({ row }) => fmtDate(row.original.expiresAt),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExtendTarget(s)}>
              <CalendarPlusIcon className="size-4" />
              Extender
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStatusTarget(s)}>
              <SlidersHorizontalIcon className="size-4" />
              Estado
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setCancelTarget(s)}
            >
              <BanIcon className="size-4" />
              Cancelar
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        toolbar={
          <>
            <Select value={plan} onValueChange={(v) => { setPlan(v); resetPage(); }}>
              <SelectTrigger className="w-40" size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los planes</SelectItem>
                {PLANS.map((p) => <SelectItem key={p} value={p}>{planLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); resetPage(); }}>
              <SelectTrigger className="w-40" size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{subscriptionStatusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="h-8 w-64"
              placeholder="Código de amigo"
              value={friendCode}
              onChange={(e) => { setFriendCode(e.target.value); resetPage(); }}
            />
            <Button size="sm" className="ml-auto" onClick={() => setGrantOpen(true)}>
              <GiftIcon className="size-4" /> Comp / grant
            </Button>
          </>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        loading={isLoading}
        onPageChange={setPage}
        emptyMessage="Sin suscripciones."
      />

      <GrantDialog open={grantOpen} onOpenChange={setGrantOpen} onGrant={(input) => grant.mutateAsync(input)} />
      {extendTarget && (
        <ExtendDialog
          key={extendTarget.id}
          target={extendTarget}
          onClose={() => setExtendTarget(null)}
          onExtend={(id, expiresAt) => extend.mutateAsync({ id, expiresAt })}
        />
      )}
      {statusTarget && (
        <StatusDialog
          key={statusTarget.id}
          target={statusTarget}
          onClose={() => setStatusTarget(null)}
          onChange={(id, st) => changeStatus.mutateAsync({ id, status: st })}
        />
      )}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancelar suscripción"
        description="Queda activa hasta expirar; no se renueva."
        destructive
        confirmLabel="Cancelar suscripción"
        onConfirm={async () => {
          if (cancelTarget) await cancel.mutateAsync(cancelTarget.id);
          setCancelTarget(null);
        }}
      />
    </div>
  );
}

function GrantDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGrant: (input: GrantInput) => Promise<unknown>;
}) {
  const [friendCode, setFriendCode] = useState('');
  const [debounced, setDebounced] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [plan, setPlan] = useState('plus');
  const [period, setPeriod] = useState('monthly');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Resuelve el usuario por código de amigo (debounced) para mostrar a quién se le otorga y acotar
  // los módulos a su país. El backend revalida (404 user + país del módulo) como defensa.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(friendCode.trim()), 300);
    return () => clearTimeout(t);
  }, [friendCode]);

  // pageSize amplio: el search del backend es `contains`, así que el match exacto del código podría
  // no quedar entre los primeros si comparte prefijo con otros; traemos suficientes para hallarlo.
  const usersQuery = useUsers({ search: debounced || undefined, page: 1, pageSize: 20 });
  const resolvedUser = debounced
    ? (usersQuery.data?.items ?? []).find(
        (u) => u.friendCode.toLowerCase() === debounced.toLowerCase(),
      ) ?? null
    : null;
  const country = resolvedUser?.country;
  const modulesQuery = useModulesTree(country);
  const modules = country ? (modulesQuery.data ?? []) : [];

  // El módulo elegido solo vale si pertenece a los módulos del país del usuario resuelto. Se deriva
  // en render (sin effect): al cambiar de usuario, el Select vuelve a vacío automáticamente.
  const effectiveModuleId = modules.some((m) => m.id === moduleId) ? moduleId : '';

  const valid = !!resolvedUser && !!effectiveModuleId && !!expiresAt;

  async function submit() {
    if (!resolvedUser) return;
    setError(null);
    setSubmitting(true);
    try {
      await props.onGrant({ friendCode: resolvedUser.friendCode, moduleId: effectiveModuleId, plan, period, expiresAt });
      props.onOpenChange(false);
      setFriendCode('');
      setModuleId('');
      setExpiresAt('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comp / grant de suscripción</DialogTitle>
          <DialogDescription>
            Crea o extiende la suscripción del usuario en ese módulo (sin pasar por IAP).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="g-code">Código de amigo</FieldLabel>
            <Input
              id="g-code"
              placeholder="KODI-####"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              aria-invalid={!!debounced && !resolvedUser && !usersQuery.isLoading}
            />
            {debounced && usersQuery.isLoading ? (
              <span className="text-muted-foreground text-sm">Buscando…</span>
            ) : resolvedUser ? (
              <span className="text-success inline-flex items-center gap-1 text-sm">
                <CircleCheckIcon className="size-3.5" />
                {resolvedUser.displayName} · {resolvedUser.country}
              </span>
            ) : debounced ? (
              <span className="text-destructive text-sm">Sin usuario con ese código.</span>
            ) : null}
          </Field>
          <Field>
            <FieldLabel>Módulo</FieldLabel>
            <Select value={effectiveModuleId} onValueChange={setModuleId} disabled={!resolvedUser}>
              <SelectTrigger>
                <SelectValue placeholder={resolvedUser ? 'Elegí un módulo' : 'Primero ingresá el código'} />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field><FieldLabel>Plan</FieldLabel>
              <Select value={plan} onValueChange={setPlan}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{planLabel(p)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field><FieldLabel>Período</FieldLabel>
              <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field><FieldLabel htmlFor="g-exp">Expira</FieldLabel><DatePicker id="g-exp" value={expiresAt} onChange={setExpiresAt} /></Field>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || submitting} onClick={submit}>
            <GiftIcon className="size-4" />
            {submitting ? 'Procesando…' : 'Otorgar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtendDialog(props: {
  target: Subscription;
  onClose: () => void;
  onExtend: (id: string, expiresAt: string) => Promise<unknown>;
}) {
  const [expiresAt, setExpiresAt] = useState(props.target.expiresAt.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await props.onExtend(props.target.id, expiresAt);
      props.onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extender suscripción</DialogTitle>
          <DialogDescription>Nueva fecha de expiración.</DialogDescription>
        </DialogHeader>
        <Field><FieldLabel htmlFor="e-exp">Expira</FieldLabel><DatePicker id="e-exp" value={expiresAt} onChange={setExpiresAt} /></Field>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>Cancelar</Button>
          <Button disabled={!expiresAt || submitting} onClick={submit}>
            <SaveIcon className="size-4" />
            {submitting ? 'Procesando…' : 'Extender'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog(props: {
  target: Subscription;
  onClose: () => void;
  onChange: (id: string, status: string) => Promise<unknown>;
}) {
  const [status, setStatus] = useState(props.target.status);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await props.onChange(props.target.id, status);
      props.onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado</DialogTitle>
        </DialogHeader>
        <Field><FieldLabel>Estado</FieldLabel>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{subscriptionStatusLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>Cancelar</Button>
          <Button disabled={submitting} onClick={submit}>
            <SaveIcon className="size-4" />
            {submitting ? 'Procesando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
