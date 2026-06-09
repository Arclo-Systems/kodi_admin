import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { BotsTabs } from './bots-tabs';

export const metadata = { title: 'Bots' };

export default async function BotsPage() {
  const user = await requireAction('view:bots');
  const canWrite = canWithScope(user.role, user.isGlobalScope, 'bots:write');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bots</h1>
        <p className="text-muted-foreground">
          Plantillas de dificultad, bots, pools (avatares/nombres) y métricas de
          balance.
        </p>
      </div>
      <BotsTabs canWrite={canWrite} />
    </div>
  );
}
