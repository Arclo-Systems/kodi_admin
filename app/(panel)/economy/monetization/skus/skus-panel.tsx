'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow } from '@/components/admin/empty-state';
import { useStoreSkus } from '@/hooks/use-store-monetization';

export function SkusPanel() {
  const { data, isLoading, error } = useStoreSkus();
  const rows = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground text-sm">
          {rows.length} SKUs en la allowlist. Es allowlist y no parser: si el par (producto, base
          plan) no está acá, no se concede nada.
        </p>
        <Button variant="outline" size="sm" className="ml-auto" disabled>
          Correr sync en dry-run
        </Button>
      </div>

      <Alert>
        <AlertDescription>
          El sincronizador contra Play Console todavía no existe (llega con la puesta en marcha del
          catálogo). Hasta entonces el botón queda apagado en vez de fingir una comparación.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Base plan</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Pack</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmptyRow
                    colSpan={6}
                    message="Sin SKUs"
                    description="Corré el seed del catálogo de tienda."
                  />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.productId}</TableCell>
                      <TableCell className="font-mono text-xs">{row.basePlanId}</TableCell>
                      <TableCell>{row.plan}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.packSize}</TableCell>
                      <TableCell className="space-x-1">
                        <Badge variant={row.isActive ? 'secondary' : 'outline'}>
                          {row.isActive ? 'Activo' : 'Apagado'}
                        </Badge>
                        {row.isFounder && <Badge variant="default">Fundador</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
