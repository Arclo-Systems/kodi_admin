import { PackageIcon } from 'lucide-react';
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

type InventoryItem = {
  id: string;
  acquiredAt: string;
  isEquipped?: boolean;
  item: { name: string; itemType: string; tier: string | null };
};

export default async function InventoryTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/inventory`);
  const items = unwrapData<InventoryItem[]>(await res.json()) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="text-primary size-4" />
          Inventario
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin items.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Adquirido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">
                    {it.item.name}
                    {it.isEquipped && (
                      <Badge variant="secondary" className="ml-2">
                        Equipado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{it.item.itemType}</TableCell>
                  <TableCell>{it.item.tier ?? '—'}</TableCell>
                  <TableCell>{new Date(it.acquiredAt).toLocaleDateString('es')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
