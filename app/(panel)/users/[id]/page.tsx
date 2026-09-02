import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';
import {
  FlameIcon,
  GraduationCapIcon,
  ListChecksIcon,
  PencilIcon,
  SwordsIcon,
  TargetIcon,
  UserIcon,
} from 'lucide-react';
import { KpiCard } from '@/components/admin/kpi-card';
import { getUserDetail, type UserDetail } from '@/lib/user-detail';
import { AdvancedStatsCard, type UserAdvancedStats } from './advanced-stats-card';
import { ModuleChips } from './module-chips';
import { ProfileEditForm } from './profile-edit-form';
import { NotificationsCard } from './notifications-card';
import { UserExams } from './user-exams';

type UserStats = {
  accuracyPct: number;
  accuracyDeltaPct: number;
  questionsTotal: number;
  longestStreakDays: number;
  matchesPlayed: number;
  matchesWon: number;
  simulacros: number;
};

async function getUserStats(id: string): Promise<UserStats | null> {
  const res = await adminFetch(`/v1/admin/users/${id}/stats`);
  if (!res.ok) return null;
  return unwrapData<UserStats>(await res.json()) ?? null;
}

async function getUserAdvancedStats(id: string): Promise<UserAdvancedStats | null> {
  const res = await adminFetch(`/v1/admin/users/${id}/advanced-stats`);
  if (!res.ok) return null;
  return unwrapData<UserAdvancedStats>(await res.json()) ?? null;
}

const DISCOVERY_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  google: 'Google',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tv: 'TV',
  app_store: 'App Store',
  noticias: 'Noticias',
  recomendacion: 'Recomendación',
  otro: 'Otro',
};

function fmtDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('es') : '—';
}

export default async function UserProfileTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, stats, advanced] = await Promise.all([
    getUserDetail(id),
    getUserStats(id),
    getUserAdvancedStats(id),
  ]);
  if (!user) notFound();

  return (
    <div className="space-y-8">
      {stats && <PerformanceCard stats={stats} />}

      {/* Lectura: bandas full-width. Los datos del usuario son escasos (un alumno
          nuevo casi no tiene meta), así que 2 columnas dejarían voids; una sola
          banda con campos en grilla densa se llena sola (DESIGN L8). */}
      <div className="space-y-6">
        <AdvancedStatsCard advanced={advanced} />
        <AccountCard user={user} />
      </div>

      {/* Edición: notificaciones y perfil, lado a lado. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <NotificationsCard user={user} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PencilIcon className="text-primary size-4" />
              Datos del perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileEditForm user={user} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AccountCard({ user }: { user: UserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="text-primary size-4" />
          Cuenta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          <Field label="Racha máxima">
            <span className="tabular-nums">{user.longestStreakDays}</span> días
          </Field>
          <Field label="Meta-racha">
            <span className="tabular-nums">{user.goalStreakDays}</span> días
          </Field>
          <Field label="Congelador de racha">
            <span className="tabular-nums">{user.streakProtectors}</span>{' '}
            {user.streakProtectors === 1 ? 'protector' : 'protectores'}
          </Field>
          <Field label="Cómo nos conoció">
            {user.discoverySource
              ? (DISCOVERY_LABEL[user.discoverySource] ?? user.discoverySource)
              : '—'}
          </Field>
          <Field label="Requiere cambio de contraseña">
            {user.requirePasswordChange ? (
              <span className="text-warning">
                Sí · vence {fmtDate(user.temporaryPasswordExpiresAt)}
              </span>
            ) : (
              'No'
            )}
          </Field>
        </dl>

        <Subsection title="Privacidad" hint="Solo lectura: lo controla el usuario desde la app.">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
            <Field label="Perfil público">{user.profilePublic ? 'Sí' : 'No'}</Field>
            <Field label="Aparecer en rankings">{user.showInRankings ? 'Sí' : 'No'}</Field>
            <Field label="Quién puede agregarlo">
              {user.friendRequestPolicy === 'nobody' ? 'Nadie' : 'Todos'}
            </Field>
          </dl>
        </Subsection>

        <Subsection title="Módulos registrados">
          <ModuleChips
            modules={user.userModules.map((m) => m.module)}
            activeModule={user.activeModule}
          />
        </Subsection>

        <Subsection
          title="Exámenes"
          hint="Solo lectura: el examen activo lo cambia el usuario desde Mis exámenes."
        >
          <UserExams examDates={user.examDates} />
        </Subsection>
      </CardContent>
    </Card>
  );
}

function Subsection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border/60 border-t pt-5">
      <p className="text-muted-foreground mb-3 text-xs font-medium">{title}</p>
      {children}
      {hint && <p className="text-muted-foreground mt-3 text-xs">{hint}</p>}
    </div>
  );
}

function PerformanceCard({ stats }: { stats: UserStats }) {
  const direction =
    stats.accuracyDeltaPct > 0 ? 'up' : stats.accuracyDeltaPct < 0 ? 'down' : 'flat';
  return (
    <section>
      <h2 className="text-muted-foreground mb-3 text-sm font-semibold">Rendimiento</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="% Aciertos"
          value={`${stats.accuracyPct}%`}
          tone="green"
          icon={<TargetIcon />}
          delta={{ value: stats.accuracyDeltaPct, direction, label: 'vs sem.' }}
        />
        <KpiCard
          label="Preguntas"
          value={stats.questionsTotal.toLocaleString('es')}
          tone="teal"
          icon={<ListChecksIcon />}
        />
        <KpiCard
          label="Racha máxima"
          value={stats.longestStreakDays}
          tone="amber"
          icon={<FlameIcon />}
        />
        <KpiCard
          label="Partidas (ganadas)"
          value={`${stats.matchesWon}/${stats.matchesPlayed}`}
          tone="blue"
          icon={<SwordsIcon />}
        />
        <KpiCard
          label="Simulacros"
          value={stats.simulacros}
          tone="neutral"
          icon={<GraduationCapIcon />}
        />
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}
