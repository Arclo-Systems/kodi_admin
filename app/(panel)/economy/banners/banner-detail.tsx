'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CircleCheckIcon,
  CircleOffIcon,
  EyeIcon,
  MegaphoneIcon,
  MousePointerClickIcon,
  PencilIcon,
  PercentIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { useBanner, useBannerStats, PLACEMENT_LABELS } from '@/hooks/use-banners';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { StatusBadge } from '@/lib/status-badge';
import { COUNTRIES } from '@/lib/countries';
import { KpiCard } from '@/components/admin/kpi-card';
import { PlacementPreview } from './placement-preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-semibold break-all">{children}</span>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/economy/banners"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon className="size-3" />
      Banners
    </Link>
  );
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('es-CR', { dateStyle: 'medium' });
}

export function BannerDetail({ id, role }: { id: string; role: AdminRole }) {
  const { data: b, isLoading } = useBanner(id);
  const stats = useBannerStats(id);
  const canWrite = can(role, 'economy:banner:write');

  if (!isLoading && !b) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">No se encontró el banner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <BackLink />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {b?.sponsor?.name ?? b?.sponsorName ?? <Skeleton className="h-7 w-40" />}
            </h1>
            {b &&
              (b.isActive ? (
                <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
              ) : (
                <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
              ))}
          </div>
          {b && (
            <p className="text-muted-foreground">
              {PLACEMENT_LABELS[b.placement]} · {b.country} · {countryLabel(b.country)}
            </p>
          )}
        </div>
        {canWrite && b && (
          <Button asChild size="sm">
            <Link href={`/economy/banners/${id}/edit`}>
              <PencilIcon className="size-4" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Impresiones"
          value={(stats.data?.impressions ?? 0).toLocaleString('es-CR')}
          icon={<EyeIcon />}
          tone="teal"
          loading={stats.isLoading}
        />
        <KpiCard
          label="Clics"
          value={(stats.data?.clicks ?? 0).toLocaleString('es-CR')}
          icon={<MousePointerClickIcon />}
          tone="blue"
          loading={stats.isLoading}
        />
        <KpiCard
          label="CTR"
          value={stats.data ? `${(stats.data.ctr * 100).toFixed(2)}%` : '0%'}
          icon={<PercentIcon />}
          tone="amber"
          loading={stats.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MegaphoneIcon className="text-primary size-4" />
              Detalle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {b ? (
              <dl className="[&>div:last-child]:border-b-0">
                <DetailRow label="Placement">{PLACEMENT_LABELS[b.placement]}</DetailRow>
                <DetailRow label="País">
                  {b.country} · {countryLabel(b.country)}
                </DetailRow>
                <DetailRow label="Peso">{b.weight}</DetailRow>
                <DetailRow label="URL destino">{b.clickUrl ?? 'No clickable'}</DetailRow>
                <DetailRow label="Vigencia">
                  {fmtDate(b.startsAt)} – {fmtDate(b.endsAt)}
                </DetailRow>
              </dl>
            ) : (
              <div className="space-y-2 py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {b && (
          <div className="space-y-2">
            <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <SmartphoneIcon className="size-4" />
              Vista previa
            </h2>
            <PlacementPreview placement={b.placement} imageUrl={b.imageUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
