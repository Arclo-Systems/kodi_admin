import { TrophyIcon } from 'lucide-react';
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

type UserAchievement = {
  id: string;
  earnedAt: string;
  achievement: { code: string; name: string; description: string | null; tier: string | null };
};

export default async function AchievementsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/achievements`);
  const items = unwrapData<UserAchievement[]>(await res.json()) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrophyIcon className="text-warning size-4" />
          Logros
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin logros.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logro</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Obtenido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.achievement.name}</div>
                    {a.achievement.description && (
                      <div className="text-muted-foreground text-xs">{a.achievement.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.achievement.tier ? <Badge variant="outline">{a.achievement.tier}</Badge> : '—'}
                  </TableCell>
                  <TableCell>{new Date(a.earnedAt).toLocaleDateString('es')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
