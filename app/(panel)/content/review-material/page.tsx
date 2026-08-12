import Link from 'next/link';
import { SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { ReviewMaterialTree } from './review-material-tree';

export const metadata = { title: 'Material de repaso' };

export default async function ReviewMaterialPage() {
  const user = await requireAction('content:review-material:write');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Material de repaso</h1>
          <p className="text-muted-foreground">
            Tarjetas, resúmenes y podcasts por tema — cada pieza se publica por separado
          </p>
        </div>
        {can(user.role, 'content:review-material:publish') && (
          <Button asChild variant="outline" size="sm">
            <Link href="/content/review-material/settings">
              <SettingsIcon className="size-4" />
              Configuración
            </Link>
          </Button>
        )}
      </div>
      <ReviewMaterialTree />
    </div>
  );
}
