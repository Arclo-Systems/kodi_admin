'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { AdminRole } from '@/lib/auth';
import { useAiPrompt } from '@/hooks/use-ai-prompts';
import { ActivePromptBadge } from '@/lib/ai-prompt-status';
import { PromptEditor } from './prompt-editor';
import { PromptVersionHistory } from './prompt-version-history';
import { PromptPlaygroundPanel } from './prompt-playground-panel';

export function AiPromptDetail({ id, role }: { id: string; role: AdminRole }) {
  const { data, isLoading } = useAiPrompt(id);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!data) return <p className="text-muted-foreground">No se encontró el prompt.</p>;

  const activeVersion = data.versions.find((v) => v.id === data.activeVersionId);
  const active = activeVersion ?? data.versions[0];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm">{data.key}</code>
          <span className="text-muted-foreground text-sm">· {data.country ?? 'global'}</span>
          <ActivePromptBadge
            active={!!data.activeVersionId}
            label={activeVersion ? `v${activeVersion.version} activa` : 'Sin versión activa'}
          />
        </div>
        <p className="text-muted-foreground text-sm">{data.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PromptEditor prompt={data} />
        <PromptVersionHistory prompt={data} role={role} />
      </div>

      <PromptPlaygroundPanel
        initialSystemText={active?.systemText ?? ''}
        variables={active?.variables ?? []}
      />
    </div>
  );
}
