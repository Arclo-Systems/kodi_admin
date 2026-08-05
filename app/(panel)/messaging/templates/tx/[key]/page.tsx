import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
import { requireAction } from '@/lib/guard';
import { TX_TEMPLATE_LABELS } from '@/lib/tx-templates';
import { TxTemplateEditor } from './tx-template-editor';

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: TX_TEMPLATE_LABELS[key] ?? 'Email transaccional' };
}

export default async function TxTemplatePage({ params }: { params: Promise<{ key: string }> }) {
  await requireAction('messaging:templates');
  const { key } = await params;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/messaging/templates"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeftIcon className="size-4" />
          Plantillas
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{TX_TEMPLATE_LABELS[key] ?? key}</h1>
          <p className="text-muted-foreground">
            Sale solo cuando el usuario dispara la acción. Editás el texto; la estructura del
            correo la define la identidad.
          </p>
        </div>
      </div>
      <TxTemplateEditor templateKey={key} />
    </div>
  );
}
