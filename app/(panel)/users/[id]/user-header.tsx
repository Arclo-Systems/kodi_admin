import { Fragment } from 'react';
import {
  BanIcon,
  BanknoteIcon,
  BookOpenIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  CoinsIcon,
  FlameIcon,
  type LucideIcon,
  ShieldAlertIcon,
  TrashIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import { PlanBadge } from '@/lib/plans';
import type { UserDetail } from '@/lib/user-detail';
import { UserActions } from './user-actions';

const STATUS: Record<string, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  active: { label: 'Activo', icon: CircleCheckIcon, tone: 'success' },
  suspended: { label: 'Suspendido', icon: BanIcon, tone: 'destructive' },
  pending_parental: { label: 'Pendiente parental', icon: ClockIcon, tone: 'warning' },
  deleted: { label: 'Eliminado', icon: CircleDashedIcon, tone: 'muted' },
};

function fmtDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('es') : '—';
}

function age(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function UserHeader({ user }: { user: UserDetail }) {
  const status = STATUS[user.accountStatus];
  const verified = !!user.emailVerifiedAt;
  const years = age(user.birthDate);

  return (
    <div className="space-y-3">
      {user.bannedUntil && (
        <Banner tone="destructive" icon={<ShieldAlertIcon className="size-4" />}>
          Baneado hasta {fmtDate(user.bannedUntil)}
          {user.banReason ? ` · ${user.banReason}` : ''}
        </Banner>
      )}
      {user.deleteRequestedAt && (
        <Banner tone="warning" icon={<TrashIcon className="size-4" />}>
          Solicitó eliminar su cuenta el {fmtDate(user.deleteRequestedAt)}
        </Banner>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{user.displayName}</h1>
            {[
              user.isBot ? (
                <Badge key="bot" variant="secondary">
                  Bot
                </Badge>
              ) : null,
              status ? (
                <StatusBadge key="status" tone={status.tone} icon={status.icon} label={status.label} />
              ) : (
                <Badge key="status" variant="outline">
                  {user.accountStatus}
                </Badge>
              ),
              <PlanBadge key="plan" plan={user.plan} />,
              <Badge key="country" variant="outline">
                {user.country}
              </Badge>,
              user.titleActive ? (
                <Badge key="title" variant="outline">
                  🎓 {user.titleActive}
                </Badge>
              ) : null,
            ]
              .filter(Boolean)
              .map((node, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <span aria-hidden className="text-muted-foreground/50">
                      ·
                    </span>
                  )}
                  {node}
                </Fragment>
              ))}
          </div>

          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {[
              user.username ? <span key="user">@{user.username}</span> : null,
              <span key="email">{user.email}</span>,
              <span
                key="ver"
                className={verified ? 'text-success' : 'text-warning'}
                title={verified ? 'Correo verificado' : 'Correo sin verificar'}
              >
                {verified ? '✓ verificado' : '⚠ sin verificar'}
              </span>,
              <span key="code">{user.friendCode}</span>,
            ]
              .filter(Boolean)
              .map((node, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <span aria-hidden className="text-muted-foreground/50">
                      ·
                    </span>
                  )}
                  {node}
                </Fragment>
              ))}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Meta icon={<FlameIcon className="text-warning size-4" />} label="Racha">
              {user.streakDays}d
            </Meta>
            <Meta icon={<CoinsIcon className="text-warning size-4" />} label="Kokos">
              {user.kokosBalance.toLocaleString('es')}
            </Meta>
            <Meta icon={<BanknoteIcon className="text-primary size-4" />} label="Kolones">
              {user.kolonesBalance.toLocaleString('es')}
            </Meta>
            {user.activeModule && (
              <Meta icon={<BookOpenIcon className="text-info size-4" />} label="Módulo">
                {user.activeModule.shortName}
              </Meta>
            )}
            {years !== null && (
              <Meta icon={<CalendarPlusIcon className="text-muted-foreground size-4" />} label="Edad">
                {years}
              </Meta>
            )}
            <Meta icon={<CalendarPlusIcon className="text-muted-foreground size-4" />} label="Alta">
              {fmtDate(user.createdAt)}
            </Meta>
            <Meta icon={<ClockIcon className="text-muted-foreground size-4" />} label="Última actividad">
              {fmtDate(user.lastActiveAt)}
            </Meta>
          </div>
        </div>
        <UserActions user={user} />
      </div>
    </div>
  );
}

function Meta({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <strong className="tabular-nums">{children}</strong>
    </span>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'destructive' | 'warning';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls =
    tone === 'destructive'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-warning/30 bg-warning/10 text-warning';
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${cls}`}>
      {icon}
      {children}
    </div>
  );
}
