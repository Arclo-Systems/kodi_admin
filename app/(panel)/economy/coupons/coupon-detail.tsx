'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CircleCheckIcon,
  CircleOffIcon,
  CoinsIcon,
  DownloadIcon,
  PencilIcon,
  PercentIcon,
  TicketIcon,
} from 'lucide-react';
import { useCoupon, useCouponStats } from '@/hooks/use-coupons';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { StatusBadge } from '@/lib/status-badge';
import { KpiCard } from '@/components/admin/kpi-card';
import { CouponRedemptions } from './coupon-redemptions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { COUNTRIES } from '@/lib/countries';

const TIER_LABEL: Record<string, string> = {
  basico: 'Básico',
  estandar: 'Estándar',
  premium: 'Premium',
};

function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-semibold">{children}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/economy/coupons"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon className="size-3" />
      Cupones
    </Link>
  );
}

export function CouponDetail({ id, role }: { id: string; role: AdminRole }) {
  const { data: coupon, isLoading } = useCoupon(id);
  const stats = useCouponStats(id);
  const canEdit = can(role, 'economy:coupon:write');

  if (!isLoading && !coupon) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">No se encontró el cupón.</p>
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
              {coupon?.title ?? <Skeleton className="h-7 w-48" />}
            </h1>
            {coupon &&
              (coupon.isActive ? (
                <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
              ) : (
                <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" />
              ))}
          </div>
          {coupon && (
            <p className="text-muted-foreground">
              {coupon.sponsor.name} · {coupon.country} · {countryLabel(coupon.country)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/admin/economy/coupons/${id}/export`} download>
              <DownloadIcon className="size-4" />
              Exportar CSV
            </a>
          </Button>
          {canEdit && (
            <Button asChild size="sm">
              <Link href={`/economy/coupons/${id}/edit`}>
                <PencilIcon className="size-4" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Canjeados"
          value={stats.data?.redeemed ?? 0}
          icon={<TicketIcon />}
          tone="teal"
          loading={stats.isLoading}
        />
        <KpiCard
          label="Usados"
          value={stats.data?.used ?? 0}
          icon={<CircleCheckIcon />}
          tone="green"
          loading={stats.isLoading}
        />
        <KpiCard
          label="Tasa de redención"
          value={stats.data ? `${(stats.data.redemptionRate * 100).toFixed(1)}%` : '0%'}
          icon={<PercentIcon />}
          tone="blue"
          loading={stats.isLoading}
        />
        <KpiCard
          label="Kolones gastados"
          value={(stats.data?.kolonesSpent ?? 0).toLocaleString('es-CR')}
          icon={<CoinsIcon />}
          tone="amber"
          loading={stats.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketIcon className="text-primary size-4" />
            Detalle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {coupon ? (
            <>
              {coupon.description && (
                <p className="text-sm leading-relaxed">{coupon.description}</p>
              )}
              <dl className="[&>div:last-child]:border-b-0">
                <Stat label="Tier">
                  <Badge variant="secondary">{TIER_LABEL[coupon.tier] ?? coupon.tier}</Badge>
                </Stat>
                <Stat label="Categoría">{coupon.category}</Stat>
                <Stat label="Costo">{coupon.kolonesCost.toLocaleString('es-CR')} Kolones</Stat>
                <Stat label="Stock">
                  {coupon.stockTotal === null
                    ? '∞'
                    : `${coupon.stockRemaining ?? 0} / ${coupon.stockTotal}`}
                </Stat>
                <Stat label="Límite por usuario">{coupon.limitPerUser ?? '∞'}</Stat>
                <Stat label="Solo Pro">{coupon.isProExclusive ? 'Sí' : 'No'}</Stat>
                <Stat label="Prefijo de código">{coupon.codePrefix ?? 'KOD'}</Stat>
                <Stat label="Válido hasta">
                  {coupon.validUntil
                    ? new Date(coupon.validUntil).toLocaleDateString('es-CR')
                    : 'Sin vencimiento'}
                </Stat>
                <Stat label="Vigencia tras canje">{coupon.validDaysAfterRedeem} días</Stat>
              </dl>
              {coupon.conditions.length > 0 && (
                <div className="space-y-1.5 border-t pt-4">
                  <p className="text-muted-foreground text-xs">Condiciones</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {coupon.conditions.map((c, i) => (
                      <li key={`${c}-${i}`}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CouponRedemptions couponId={id} role={role} />
    </div>
  );
}
