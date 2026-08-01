import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { NotificationsCatalog } from './notifications-catalog';

export const metadata: Metadata = { title: 'Notificaciones' };

export default async function NotificationsPage() {
  await requireAction('view:notifications');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
        <p className="text-muted-foreground">
          Qué avisos le pueden llegar al estudiante y qué los dispara. Es de solo
          lectura: acá no se manda nada ni se ve a quién se le mandó.
        </p>
      </div>
      <NotificationsCatalog />
    </div>
  );
}
