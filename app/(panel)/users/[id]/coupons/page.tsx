import { TicketIcon } from 'lucide-react';
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

type UserCoupon = {
  id: string;
  code: string;
  redeemedAt: string;
  expiresAt: string;
  usedAt: string | null;
  invalidatedAt: string | null;
  invalidateReason: string | null;
  kolonesSpent: number;
  coupon: { title: string; sponsor: { name: string } };
};

type StatusCfg = { v: 'default' | 'destructive' | 'outline' | 'secondary'; l: string };

function statusOf(c: UserCoupon): StatusCfg {
  if (c.invalidatedAt) return { v: 'destructive', l: 'Anulado' };
  if (c.usedAt) return { v: 'secondary', l: 'Usado' };
  if (new Date(c.expiresAt) < new Date()) return { v: 'outline', l: 'Vencido' };
  return { v: 'default', l: 'Activo' };
}

const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('es') : '—');

export default async function CouponsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/coupons`);
  const items = unwrapData<UserCoupon[]>(await res.json()) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon className="text-primary size-4" />
          Cupones canjeados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin cupones canjeados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cupón</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Kolones</TableHead>
                <TableHead>Canjeado</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => {
                const st = statusOf(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.coupon.title}</div>
                      <div className="text-muted-foreground text-xs">{c.coupon.sponsor.name}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.kolonesSpent.toLocaleString('es')}
                    </TableCell>
                    <TableCell className="tabular-nums">{fmt(c.redeemedAt)}</TableCell>
                    <TableCell className="tabular-nums">{fmt(c.expiresAt)}</TableCell>
                    <TableCell>
                      <Badge variant={st.v} title={c.invalidateReason ?? undefined}>
                        {st.l}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
