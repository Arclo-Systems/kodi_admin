import { requireAction } from '@/lib/guard';
import { AiPromptDetail } from '../ai-prompt-detail';

export const metadata = { title: 'Prompt' };

export default async function AiPromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAction('content:ai-prompt:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Prompt</h1>
        <p className="text-muted-foreground">Editá versiones, activá (rollback) y probá en el playground.</p>
      </div>
      <AiPromptDetail id={id} role={user.role} />
    </div>
  );
}
