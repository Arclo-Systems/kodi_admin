import { requireAction } from '@/lib/guard';
import { MessagingNav } from '../messaging-nav';
import { BrandManager } from './brand-manager';

export const metadata = { title: 'Identidad del correo' };

export default async function EmailBrandPage() {
  const user = await requireAction('messaging:brand');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Identidad del correo</h1>
        <p className="text-muted-foreground">
          Mascota, logo, colores y redes que usan TODOS los correos: transaccionales y campañas.
        </p>
      </div>
      <MessagingNav role={user.role} isGlobalScope={user.isGlobalScope} />
      <BrandManager />
    </div>
  );
}
