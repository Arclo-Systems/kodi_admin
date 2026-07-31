'use client';

import { useState } from 'react';
import {
  CircleCheckIcon,
  EyeIcon,
  GraduationCapIcon,
  PhoneIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
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
import { SCHOLARSHIP_STATUS, scholarshipStatusLabel } from '@/lib/scholarship-status';
import { planLabel } from '@/lib/plans';
import { COUNTRIES } from '@/lib/countries';
import { EXAM_TYPE_LABELS } from '@/lib/exam-types';
import { useModulesTree } from '@/hooks/use-modules-tree';
import {
  useScholarships,
  useScholarshipMutations,
  type ApproveScholarshipInput,
  type Scholarship,
} from '@/hooks/use-scholarships';

const PLANS = ['basico', 'plus', 'pro'] as const;
const PERIODS = ['monthly', 'quarterly', 'yearly'] as const;
const PERIOD_LABELS: Record<string, string> = { monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' };
const PERIOD_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };
const STATUSES = ['pending', 'approved', 'rejected'] as const;
// Los nombres salen de lib/exam-types: acá estaban copiados y ya se habían
// desincronizado una vez (decían cosevi/paa/pne, que no existen).
const EXAM_LABELS: Record<string, string> = EXAM_TYPE_LABELS;
const ALL = 'all';
const PAGE_SIZE = 20;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');

const countryLabel = (code: string) => {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? `${c.flag} ${c.label}` : code;
};

// Fecha default de expiración derivada del período (el admin puede ajustarla en el DatePicker).
function expiresFromPeriod(period: string): string {
  const d = new Date();
  d.setMonth(d.getMonth() + (PERIOD_MONTHS[period] ?? 1));
  return d.toISOString().slice(0, 10);
}

function AccountMatch({ scholarship }: { scholarship: Scholarship }) {
  const m = scholarship.matchedUser;
  if (!m) {
    return (
      <span className="text-warning inline-flex items-center gap-1 text-sm">
        <TriangleAlertIcon className="size-3.5" />
        Sin cuenta — contactar por celular
      </span>
    );
  }
  return (
    <span className="text-success inline-flex items-center gap-1 text-sm">
      <CircleCheckIcon className="size-3.5" />
      {m.displayName} · {m.friendCode} · {m.country}
    </span>
  );
}

export function ScholarshipsTable() {
  const [status, setStatus] = useState<string>('pending');
  const [country, setCountry] = useState(ALL);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useScholarships({
    page,
    pageSize: PAGE_SIZE,
    status: status === ALL ? undefined : status,
    country: country === ALL ? undefined : country,
    search: search.trim() || undefined,
  });
  const { approve, reject } = useScholarshipMutations();

  const [detailTarget, setDetailTarget] = useState<Scholarship | null>(null);
  const [approveTarget, setApproveTarget] = useState<Scholarship | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Scholarship | null>(null);

  const resetPage = () => setPage(1);

  const columns: ColumnDef<Scholarship, unknown>[] = [
    {
      id: 'applicant',
      header: 'Solicitante',
      meta: { label: 'Solicitante' },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.fullName}</div>
          <div className="text-muted-foreground text-xs">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'country',
      header: 'País',
      meta: { label: 'País' },
      cell: ({ row }) => countryLabel(row.original.country),
    },
    {
      accessorKey: 'examSlug',
      header: 'Examen',
      meta: { label: 'Examen' },
      cell: ({ row }) => EXAM_LABELS[row.original.examSlug] ?? row.original.examSlug,
    },
    {
      id: 'account',
      header: 'Cuenta',
      meta: { label: 'Cuenta' },
      cell: ({ row }) => <AccountMatch scholarship={row.original} />,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      meta: { label: 'Estado' },
      cell: ({ row }) => {
        const st = SCHOLARSHIP_STATUS[row.original.status];
        return st ? (
          <StatusBadge tone={st.tone} icon={st.icon} label={st.label} />
        ) : (
          <span className="text-muted-foreground">{row.original.status}</span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Recibida',
      meta: { label: 'Recibida' },
      cell: ({ row }) => fmtDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setDetailTarget(row.original)}>
            <EyeIcon className="size-4" />
            Revisar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        toolbar={
          <>
            <Select value={status} onValueChange={(v) => { setStatus(v); resetPage(); }}>
              <SelectTrigger className="w-40" size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{scholarshipStatusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={country} onValueChange={(v) => { setCountry(v); resetPage(); }}>
              <SelectTrigger className="w-44" size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los países</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.flag} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-8 w-64"
              placeholder="Email o nombre"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
          </>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        loading={isLoading}
        onPageChange={setPage}
        emptyMessage="Sin solicitudes de beca."
      />

      {detailTarget && (
        <DetailDialog
          key={detailTarget.id}
          scholarship={detailTarget}
          onClose={() => setDetailTarget(null)}
          onApprove={() => { setApproveTarget(detailTarget); setDetailTarget(null); }}
          onReject={() => { setRejectTarget(detailTarget); setDetailTarget(null); }}
        />
      )}
      {approveTarget && (
        <ApproveDialog
          key={approveTarget.id}
          scholarship={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApprove={async (input) => {
            await approve.mutateAsync(input);
            toast.success('Beca otorgada: suscripción activada.');
          }}
        />
      )}
      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title="Rechazar solicitud"
        description="El motivo queda en las notas internas de la solicitud."
        destructive
        requireReason
        confirmLabel="Rechazar"
        onConfirm={async ({ reason }) => {
          if (rejectTarget) {
            await reject.mutateAsync({ id: rejectTarget.id, adminNotes: reason });
            toast.success('Solicitud rechazada.');
          }
          setRejectTarget(null);
        }}
      />
    </div>
  );
}

function DetailDialog(props: {
  scholarship: Scholarship;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const s = props.scholarship;
  const st = SCHOLARSHIP_STATUS[s.status];
  const isPending = s.status === 'pending';

  return (
    <Dialog open onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitud de {s.fullName}</DialogTitle>
          <DialogDescription>
            {EXAM_LABELS[s.examSlug] ?? s.examSlug} · {countryLabel(s.country)} · recibida el{' '}
            {fmtDate(s.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            {st && <StatusBadge tone={st.tone} icon={st.icon} label={st.label} />}
            <a
              href={`tel:${s.phoneCountryCode}${s.phoneNumber}`}
              className="text-primary inline-flex items-center gap-1 hover:underline"
            >
              <PhoneIcon className="size-3.5" />
              {s.phoneCountryCode} {s.phoneNumber}
            </a>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">Cuenta Kodi</div>
            <AccountMatch scholarship={s} />
            <div className="text-muted-foreground mt-0.5 text-xs">Email declarado: {s.email}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">Situación</div>
            <p className="bg-muted rounded-md p-3 whitespace-pre-wrap">{s.message}</p>
          </div>
          {s.adminNotes && (
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">Notas internas</div>
              <p className="whitespace-pre-wrap">{s.adminNotes}</p>
            </div>
          )}
          {s.reviewedAt && (
            <p className="text-muted-foreground text-xs">Revisada el {fmtDate(s.reviewedAt)}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>Cerrar</Button>
          {isPending && (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={props.onReject}
              >
                Rechazar
              </Button>
              <Button onClick={props.onApprove} disabled={!s.matchedUser}>
                <GraduationCapIcon className="size-4" />
                Aprobar
              </Button>
            </>
          )}
        </DialogFooter>
        {isPending && !s.matchedUser && (
          <p className="text-muted-foreground text-xs">
            No se puede aprobar sin una cuenta que coincida con el email: contactá al estudiante por
            celular para que cree su cuenta o corrija el email.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApproveDialog(props: {
  scholarship: Scholarship;
  onClose: () => void;
  onApprove: (input: ApproveScholarshipInput) => Promise<void>;
}) {
  const s = props.scholarship;
  const user = s.matchedUser;
  const [moduleId, setModuleId] = useState('');
  const [plan, setPlan] = useState('plus');
  const [period, setPeriod] = useState('monthly');
  const [expiresAt, setExpiresAt] = useState(expiresFromPeriod('monthly'));
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // grant() valida el módulo contra el país de la CUENTA, no el declarado en la solicitud.
  const modulesQuery = useModulesTree(user?.country);
  const modules = user ? (modulesQuery.data ?? []) : [];
  const effectiveModuleId = modules.some((m) => m.id === moduleId) ? moduleId : '';
  const countryMismatch = !!user && user.country !== s.country;
  const valid = !!user && !!effectiveModuleId && !!expiresAt;
  const moduleName = modules.find((m) => m.id === effectiveModuleId)?.shortName ?? '';

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && props.onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar beca de {s.fullName}</DialogTitle>
            <DialogDescription>
              Activa una suscripción comp en la cuenta {user?.displayName} ({user?.friendCode}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {countryMismatch && (
              <Alert>
                <TriangleAlertIcon className="size-4" />
                <AlertDescription>
                  La cuenta es de {countryLabel(user.country)} pero la solicitud declara{' '}
                  {countryLabel(s.country)}. Los módulos listados son los del país de la cuenta.
                </AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel>Módulo</FieldLabel>
              <Select value={effectiveModuleId} onValueChange={setModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí el módulo del examen" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.shortName}</SelectItem>
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
                <Select value={period} onValueChange={(v) => { setPeriod(v); setExpiresAt(expiresFromPeriod(v)); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field><FieldLabel htmlFor="a-exp">Expira</FieldLabel><DatePicker id="a-exp" value={expiresAt} onChange={setExpiresAt} /></Field>
            <Field>
              <FieldLabel htmlFor="a-notes">Notas internas (opcional)</FieldLabel>
              <Textarea
                id="a-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Ej. situación verificada por celular"
              />
            </Field>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={props.onClose}>Cancelar</Button>
            <Button disabled={!valid} onClick={() => setConfirmOpen(true)}>
              <GraduationCapIcon className="size-4" />
              Aprobar beca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Otorgar beca"
        description={`${planLabel(plan)} · ${PERIOD_LABELS[period]} · ${moduleName} hasta ${expiresAt} para ${user?.displayName}.`}
        confirmLabel="Otorgar"
        onConfirm={async () => {
          setError(null);
          try {
            await props.onApprove({
              id: s.id,
              moduleId: effectiveModuleId,
              plan,
              period,
              expiresAt,
              adminNotes: notes.trim() || undefined,
            });
            setConfirmOpen(false);
            props.onClose();
          } catch (e) {
            setConfirmOpen(false);
            setError((e as Error).message);
          }
        }}
      />
    </>
  );
}
