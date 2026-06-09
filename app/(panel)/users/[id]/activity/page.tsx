import { BookOpenIcon, SwordsIcon } from 'lucide-react';
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

type Practice = { id: string; startedAt: string; endedAt: string | null; moduleId: string };
type Match = {
  id: string;
  mode: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  winnerId: string | null;
};

function fmt(d: string | null): string {
  return d ? new Date(d).toLocaleString('es') : '—';
}

export default async function ActivityTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/activity?page=1&pageSize=20`);
  const data = unwrapData<{ practice: Practice[]; matches: Match[] }>(await res.json());
  const practice = data?.practice ?? [];
  const matches = data?.matches ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenIcon className="text-primary size-4" />
            Sesiones de práctica
          </CardTitle>
        </CardHeader>
        <CardContent>
          {practice.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin sesiones.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Módulo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {practice.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{fmt(p.startedAt)}</TableCell>
                    <TableCell>{fmt(p.endedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.moduleId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SwordsIcon className="text-info size-4" />
            Partidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin partidas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.mode}</TableCell>
                    <TableCell>{m.status}</TableCell>
                    <TableCell>{fmt(m.startedAt)}</TableCell>
                    <TableCell>{m.winnerId === id ? 'Ganó' : m.winnerId ? 'Perdió' : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
