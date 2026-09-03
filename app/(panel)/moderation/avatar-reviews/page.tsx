import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { AvatarReviewQueue } from './avatar-review-queue';

export const metadata = { title: 'Fotos de perfil' };

export default async function AvatarReviewsPage() {
  const user = await requireAction('view:moderation');
  const canDecide = canWithScope(user.role, user.isGlobalScope, 'moderation:resolve');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fotos de perfil</h1>
        <p className="text-muted-foreground">
          La foto se publica apenas el usuario la sube y entra acá para revisión. Rechazarla la
          retira de toda la app, le devuelve el avatar anterior y le avisa al usuario.
        </p>
      </div>
      <AvatarReviewQueue canDecide={canDecide} />
    </div>
  );
}
