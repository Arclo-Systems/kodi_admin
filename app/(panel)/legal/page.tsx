import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { LegalTabs } from './legal-tabs';

export const metadata = { title: 'Legal' };

export default async function LegalPage() {
  const user = await requireAction('view:legal');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Legal</h1>
        <p className="text-muted-foreground">
          Términos de uso y política de privacidad publicados. Los leen la app, la landing y las
          fichas de App Store y Google Play.
        </p>
      </div>
      <LegalTabs canWrite={can(user.role, 'legal:write')} />
    </div>
  );
}
