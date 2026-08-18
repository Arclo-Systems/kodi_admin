import {
  BadgeCheckIcon,
  BuildingIcon,
  CalendarClockIcon,
  HistoryIcon,
  LandmarkIcon,
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';

export type UniversityType = 'public' | 'private';

export const UNIVERSITY_TYPE_LABEL: Record<UniversityType, string> = {
  public: 'Pública',
  private: 'Privada',
};

const UNIVERSITY_TYPE_META: Record<UniversityType, { icon: LucideIcon; tone: StatusTone }> = {
  public: { icon: LandmarkIcon, tone: 'neutral' },
  private: { icon: BuildingIcon, tone: 'info' },
};

export function UniversityTypeBadge({ type }: { type: UniversityType }) {
  const meta = UNIVERSITY_TYPE_META[type];
  return <StatusBadge tone={meta.tone} icon={meta.icon} label={UNIVERSITY_TYPE_LABEL[type]} />;
}

/** Ventana de patrocinio tal cual la guarda el backend (ISO, o null = sin límite de ese lado). */
export type SponsorshipWindow = {
  isSponsored: boolean;
  sponsoredFrom: string | null;
  sponsoredUntil: string | null;
};

/**
 * `active` es el único estado que la app rotula "Patrocinado" (D12: transparencia
 * publicitaria, no se puede apagar desde el panel). `scheduled` y `expired` existen
 * para que el panel vea por qué una universidad marcada como patrocinada no lo muestra.
 */
export type SponsorshipState = 'none' | 'scheduled' | 'active' | 'expired';

function time(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export function sponsorshipState(
  sponsorship: SponsorshipWindow,
  now: Date = new Date(),
): SponsorshipState {
  if (!sponsorship.isSponsored) return 'none';
  const at = now.getTime();
  const from = time(sponsorship.sponsoredFrom);
  const until = time(sponsorship.sponsoredUntil);
  if (from !== null && at < from) return 'scheduled';
  if (until !== null && at > until) return 'expired';
  return 'active';
}

const SPONSORSHIP_META: Record<
  Exclude<SponsorshipState, 'none'>,
  { label: string; icon: LucideIcon; tone: StatusTone }
> = {
  active: { label: 'Patrocinada', icon: BadgeCheckIcon, tone: 'success' },
  scheduled: { label: 'Programada', icon: CalendarClockIcon, tone: 'info' },
  expired: { label: 'Vencida', icon: HistoryIcon, tone: 'muted' },
};

const day = (iso: string | null): string | null => {
  const ms = time(iso);
  return ms === null ? null : new Date(ms).toLocaleDateString('es-CR');
};

/** Vigencia legible: "15/3/2026 → 30/6/2026", "desde …", "hasta …" o null si es abierta. */
export function sponsorshipRangeLabel(sponsorship: SponsorshipWindow): string | null {
  const from = day(sponsorship.sponsoredFrom);
  const until = day(sponsorship.sponsoredUntil);
  if (from && until) return `${from} → ${until}`;
  if (from) return `desde ${from}`;
  if (until) return `hasta ${until}`;
  return null;
}

export function SponsorshipBadge({ sponsorship }: { sponsorship: SponsorshipWindow }) {
  const state = sponsorshipState(sponsorship);
  if (state === 'none') return <span className="text-muted-foreground">—</span>;
  const meta = SPONSORSHIP_META[state];
  const range = sponsorshipRangeLabel(sponsorship);
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge tone={meta.tone} icon={meta.icon} label={meta.label} />
      {range && <span className="text-muted-foreground text-xs">{range}</span>}
    </div>
  );
}
