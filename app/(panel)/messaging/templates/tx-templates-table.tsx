'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
import { TX_TEMPLATE_LABELS } from '@/lib/tx-templates';
import { useTxTemplates } from '@/hooks/use-tx-templates';

/**
 * Índice de los emails transaccionales. Cada fila abre su pantalla propia: el
 * editor tiene form + preview y no cabe replicado tres veces en esta página.
 */
export function TxTemplatesTable() {
  const { data, isLoading } = useTxTemplates();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data?.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Emails transaccionales</h2>
        <p className="text-muted-foreground text-sm">
          Los correos que salen solos ante una acción del usuario. Editá su texto; el botón, la
          estructura y el enlace de seguridad quedan fijos.
        </p>
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead className="w-32">Disparador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tpl) => (
                <TableRow key={tpl.key}>
                  <TableCell className="font-medium">
                    {/* Link real (no un <tr> con onClick): navegable con teclado y
                        abrible en pestaña nueva, como cualquier otro índice del panel. */}
                    <Link
                      href={`/messaging/templates/tx/${tpl.key}`}
                      className="hover:text-primary hover:underline"
                    >
                      {TX_TEMPLATE_LABELS[tpl.key] ?? tpl.key}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md truncate">
                    {tpl.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Automático</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
