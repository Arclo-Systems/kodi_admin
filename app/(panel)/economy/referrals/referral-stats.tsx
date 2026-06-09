'use client';

import { TrophyIcon, UserCheckIcon, UsersIcon } from 'lucide-react';
import { useReferralStats } from '@/hooks/use-referrals';
import { KpiCard } from '@/components/admin/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ReferralStats() {
  const { data, isLoading } = useReferralStats();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Referidores"
          value={data.referrersCount}
          icon={<UsersIcon />}
          tone="teal"
        />
        <KpiCard
          label="Referidos calificados"
          value={data.qualifiedReferrals}
          icon={<UserCheckIcon />}
          tone="green"
        />
      </div>
      {data.top.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrophyIcon className="text-primary size-4" />
              Top referidores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.top.map((t, i) => (
                <li key={t.referrerId ?? i} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-5 shrink-0 text-center text-sm font-medium tabular-nums">
                    {i + 1}
                  </span>
                  <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium">
                    {(t.displayName ?? '?').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {t.displayName ?? '—'}
                  </span>
                  <Badge variant="secondary">{t.qualifiedCount} calificados</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
