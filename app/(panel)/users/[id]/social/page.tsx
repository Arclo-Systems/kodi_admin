import { BanIcon, SendIcon, ShieldAlertIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/admin/kpi-card';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';

type Requester = { id: string; displayName: string };
type Social = {
  friendsCount: number;
  blocksReceived: number;
  blocksMade: number;
  friendRequestsIn: { id: string; fromUser: Requester }[];
  friendRequestsOut: { id: string; toUser: Requester }[];
};

export default async function SocialTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await adminFetch(`/v1/admin/users/${id}/social`);
  const social = unwrapData<Social>(await res.json());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Amigos" value={social?.friendsCount ?? 0} tone="teal" icon={<UsersIcon />} />
        <KpiCard
          label="Bloqueos recibidos"
          value={social?.blocksReceived ?? 0}
          tone="amber"
          icon={<ShieldAlertIcon />}
        />
        <KpiCard
          label="Bloqueos hechos"
          value={social?.blocksMade ?? 0}
          tone="neutral"
          icon={<BanIcon />}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlusIcon className="text-info size-4" />
              Solicitudes recibidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!social?.friendRequestsIn.length ? (
              <p className="text-muted-foreground text-sm">Ninguna.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {social.friendRequestsIn.map((r) => (
                  <li key={r.id}>{r.fromUser.displayName}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SendIcon className="text-primary size-4" />
              Solicitudes enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!social?.friendRequestsOut.length ? (
              <p className="text-muted-foreground text-sm">Ninguna.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {social.friendRequestsOut.map((r) => (
                  <li key={r.id}>{r.toUser.displayName}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
