import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { ReferralStats } from './referral-stats';
import { ReferralMilestones } from './referral-milestones';

export const metadata = { title: 'Referidos' };

export default async function ReferralsPage() {
  const user = await requireAction('economy:referral:read');
  const canWrite = can(user.role, 'economy:referral:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Referidos</h1>
        <p className="text-muted-foreground">
          Hitos de referido (Nº de invitados calificados → premio) y stats de
          referidores.
        </p>
      </div>
      <ReferralStats />
      <ReferralMilestones canWrite={canWrite} />
    </div>
  );
}
