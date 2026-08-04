import { requireAction } from '@/lib/guard';
import { TemplatesManager } from './templates-manager';
import { TxTemplatesManager } from './tx-templates-manager';
import { SocialLinksManager } from './social-links-manager';
import { MessagingNav } from '../messaging-nav';

export const metadata = { title: 'Plantillas' };

export default async function MessagingTemplatesPage() {
  const user = await requireAction('messaging:templates');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plantillas de mensaje</h1>
        <p className="text-muted-foreground">
          Plantillas reutilizables para el composer. Usá {'{{variables}}'} en el cuerpo.
        </p>
      </div>
      <MessagingNav role={user.role} isGlobalScope={user.isGlobalScope} />
      <TemplatesManager />
      <TxTemplatesManager />
      {/* Último: es un ajuste global de bajo tráfico de edición y sin él arriba
          empujaría el contenido principal (las plantillas) fuera del primer viewport. */}
      <SocialLinksManager />
    </div>
  );
}
