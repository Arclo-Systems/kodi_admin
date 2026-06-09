import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';
import {
  BarChart3Icon,
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
import { ProfileEditForm } from './profile-edit-form';
import { NotificationsCard } from './notifications-card';

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

type UserAdvancedStats = {
  masteryBySubject: { subject: string; accuracyPct: number; topics: number }[];
  simulacroAvgScore: number | null;
  simulacrosCompleted: number;
  weakestTopics: { topic: string; accuracyPct: number }[];
  weeklyAccuracy: { week: string; accuracyPct: number; total: number }[];
};

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

// Verde/ámbar/coral según desempeño — el color comunica (DESIGN §Vida), no es decorativo.
function accuracyTone(pct: number): string {
  if (pct >= 70) return 'bg-success';
  if (pct >= 40) return 'bg-warning';
  return 'bg-destructive';
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
          <Field label="Examen aprobado">
            {user.examPassed ? `Sí · ${fmtDate(user.examPassedAt)}` : 'No'}
          </Field>
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
          <ModuleChips user={user} />
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

// Arte de módulos disponible en /public/modules (slug = examType con guiones).
const MODULE_ICON_SLUGS = new Set([
  'paa',
  'pne-bachillerato',
  'pne-primaria',
  'cosevi-auto',
  'cosevi-moto',
]);

// Color de identidad de cada módulo, tomado del fondo de su propio arte.
const MODULE_COLOR: Record<string, string> = {
  paa: '#F47C6B', // coral
  'pne-bachillerato': '#A78BDA', // morado
  'pne-primaria': '#9BCB6C', // lima
  'cosevi-auto': '#E3B23C', // dorado
  'cosevi-moto': '#5DB7E8', // cielo
};

function ModuleChips({ user }: { user: UserDetail }) {
  if (user.userModules.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin módulos registrados.</p>;
  }
  return (
    <div className="flex flex-wrap gap-3">
      {user.userModules.map((m) => {
        const active = m.module.shortName === user.activeModule?.shortName;
        const slug = m.module.examType.replace(/_/g, '-');
        const color = MODULE_COLOR[slug] ?? '#408D99';
        return (
          <div
            key={m.module.examType}
            title={m.module.fullName}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 pr-4 ${
              active ? '' : 'border-border'
            }`}
            style={active ? { borderColor: color, backgroundColor: `${color}14` } : undefined}
          >
            {MODULE_ICON_SLUGS.has(slug) ? (
              <Image
                src={`/modules/${slug}.webp`}
                alt=""
                width={40}
                height={40}
                className="rounded-lg"
                unoptimized
              />
            ) : (
              <span
                className="bg-muted flex size-10 items-center justify-center rounded-lg text-xl"
                aria-hidden
              >
                {m.module.icon}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium">{m.module.shortName}</div>
              {active && (
                <div className="text-xs font-medium" style={{ color }}>
                  Activo
                </div>
              )}
            </div>
          </div>
        );
      })}
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

function AdvancedStatsCard({ advanced }: { advanced: UserAdvancedStats | null }) {
  const hasData =
    !!advanced &&
    (advanced.masteryBySubject.length > 0 ||
      advanced.weeklyAccuracy.length > 0 ||
      advanced.weakestTopics.length > 0 ||
      advanced.simulacrosCompleted > 0);

  // Sin datos no se renderiza (nada de card ancha con una sola línea adentro).
  if (!advanced || !hasData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3Icon className="text-info size-4" />
          Estadísticas avanzadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Promedio de simulacros">
            {advanced.simulacroAvgScore !== null ? (
              <span className="tabular-nums">{advanced.simulacroAvgScore} / 100</span>
            ) : (
              '—'
            )}
          </Field>
          <Field label="Simulacros completados">
            <span className="tabular-nums">{advanced.simulacrosCompleted}</span>
          </Field>
        </dl>

        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Aciertos por materia</p>
          {advanced.masteryBySubject.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin datos de práctica todavía.</p>
          ) : (
            <ul className="space-y-2">
              {advanced.masteryBySubject.map((m) => (
                <li key={m.subject} className="flex items-center gap-3">
                  <span className="w-36 truncate text-sm">{m.subject}</span>
                  <div
                    className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full"
                    aria-hidden
                  >
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${accuracyTone(m.accuracyPct)}`}
                      style={{ width: `${m.accuracyPct}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-20 text-right text-xs tabular-nums">
                    {m.accuracyPct}% · {m.topics}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {advanced.weeklyAccuracy.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              Evolución — aciertos por semana (últimas 8)
            </p>
            <div className="flex h-20 items-end gap-1.5">
              {advanced.weeklyAccuracy.map((w) => (
                <div
                  key={w.week}
                  role="img"
                  aria-label={`Semana del ${w.week}: ${w.accuracyPct}% de aciertos (${w.total} preguntas)`}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                >
                  <div
                    className="bg-primary w-full rounded-t"
                    style={{ height: `${Math.max(w.accuracyPct, 2)}%` }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground text-[10px] tabular-nums" aria-hidden>
                    {w.accuracyPct}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {advanced.weakestTopics.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              Temas a mejorar (menor acierto)
            </p>
            <ul className="space-y-1">
              {advanced.weakestTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{t.topic}</span>
                  <span className="text-destructive tabular-nums">{t.accuracyPct}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
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
