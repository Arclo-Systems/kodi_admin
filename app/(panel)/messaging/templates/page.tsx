import Link from 'next/link';
import { PaletteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { TemplatesManager } from './templates-manager';
import { TxTemplatesTable } from './tx-templates-table';
import { MessagingNav } from '../messaging-nav';

export const metadata = { title: 'Plantillas' };

export default async function MessagingTemplatesPage() {
  const user = await requireAction('messaging:templates');
  const canEditBrand = canWithScope(user.role, user.isGlobalScope, 'messaging:brand');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Plantillas de mensaje</h1>
          <p className="text-muted-foreground">
            Plantillas reutilizables para el composer. Usá {'{{variables}}'} en el cuerpo.
          </p>
        </div>
        {/* La mascota, los colores y las redes dejaron de vivir en esta página: son
            de TODOS los correos, no de las plantillas. Este atajo es el puente. */}
        {canEditBrand && (
          <Button asChild variant="outline">
            <Link href="/messaging/brand">
              <PaletteIcon className="size-4" />
              Identidad del correo
            </Link>
          </Button>
        )}
      </div>
      <MessagingNav role={user.role} isGlobalScope={user.isGlobalScope} />
      <TemplatesManager />
      <TxTemplatesTable />
    </div>
  );
}
