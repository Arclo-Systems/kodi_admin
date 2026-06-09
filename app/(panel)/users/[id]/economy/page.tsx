import { CoinsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type Tx = { id: string; createdAt: string; reason: string; currency: string; amount: number };

export default async function EconomyTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/transactions?page=1&pageSize=50`);
  const items = unwrapData<{ items: Tx[] }>(await res.json())?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CoinsIcon className="text-warning size-4" />
          Transacciones recientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin transacciones.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Razón</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.createdAt).toLocaleString('es')}</TableCell>
                  <TableCell>{t.reason}</TableCell>
                  <TableCell>{t.currency}</TableCell>
                  <TableCell className="text-right font-mono">{t.amount.toLocaleString('es')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
