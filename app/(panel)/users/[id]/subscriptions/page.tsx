import { CreditCardIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';
import { StatusBadge } from '@/lib/status-badge';
import { SUBSCRIPTION_STATUS } from '@/lib/subscription-status';
import { formatDate } from '@/lib/format-date';

type Subscription = {
  id: string;
  plan: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  module: { shortName: string } | null;
};

export default async function SubscriptionsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/subscriptions`);
  const items = unwrapData<Subscription[]>(await res.json()) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="text-primary size-4" />
          Suscripciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin suscripciones.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Expira</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.module?.shortName ?? '—'}</TableCell>
                  <TableCell className="capitalize">{s.plan}</TableCell>
                  <TableCell>
                    {(() => {
                      const st = SUBSCRIPTION_STATUS[s.status];
                      return st ? (
                        <StatusBadge tone={st.tone} icon={st.icon} label={st.label} />
                      ) : (
                        <Badge variant="outline">{s.status}</Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{formatDate(s.startedAt)}</TableCell>
                  <TableCell>
                    {formatDate(s.expiresAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
