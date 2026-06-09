import { requireAction } from '@/lib/guard';
import { AiPromptsTable } from './ai-prompts-table';

export const metadata = { title: 'AI Prompts' };

export default async function AiPromptsPage() {
  await requireAction('content:ai-prompt:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Prompts</h1>
        <p className="text-muted-foreground">
          Prompts del tutor IA con versionado, activación y playground.
        </p>
      </div>
      <AiPromptsTable />
    </div>
  );
}
