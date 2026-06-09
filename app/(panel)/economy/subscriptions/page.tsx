import { requireAction } from '@/lib/guard';
import { SubscriptionsTable } from './subscriptions-table';

export const metadata = { title: 'Suscripciones' };

export default async function SubscriptionsPage() {
  await requireAction('economy:subscription:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Suscripciones</h1>
        <p className="text-muted-foreground">
          Suscripciones de usuarios: comp/grant manual, extender, cancelar y cambiar estado.
        </p>
      </div>
      <SubscriptionsTable />
    </div>
  );
}
