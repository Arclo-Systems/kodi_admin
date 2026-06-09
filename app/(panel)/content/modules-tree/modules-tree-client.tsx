'use client';

import { useState } from 'react';
import { ListTreeIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { useContentTreeMutations } from '@/hooks/use-content-tree-mutations';
import { TreeView, type Selected } from './tree-view';
import { NodeDetail, type TreeView as ViewState } from './node-detail';

function toSelected(v: ViewState): Selected {
  if (v?.kind === 'module') return { type: 'module', id: v.id };
  if (v?.kind === 'subject') return { type: 'subject', id: v.id, moduleId: v.moduleId };
  if (v?.kind === 'topic') return { type: 'topic', id: v.id, subjectId: v.subjectId };
  return null;
}

function toView(s: Selected): ViewState {
  if (s?.type === 'module') return { kind: 'module', id: s.id };
  if (s?.type === 'subject') return { kind: 'subject', id: s.id, moduleId: s.moduleId };
  if (s?.type === 'topic') return { kind: 'topic', id: s.id, subjectId: s.subjectId };
  return null;
}

export function ModulesTreeClient({ canWriteModules }: { canWriteModules: boolean }) {
  const { data: tree, isLoading } = useModulesTree();
  const mut = useContentTreeMutations();
  const [view, setView] = useState<ViewState>(null);

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <ListTreeIcon className="text-primary size-4" />
            Árbol de contenido
          </h2>
          {canWriteModules && (
            <Button size="sm" variant="outline" onClick={() => setView({ kind: 'new-module' })}>
              <PlusIcon className="size-4" />
              Nuevo módulo
            </Button>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <TreeView
            tree={tree ?? []}
            selected={toSelected(view)}
            onSelect={(s) => setView(toView(s))}
            onReorderSubjects={(moduleId, orderedIds) =>
              mut.reorderSubjects.mutate(
                { parentId: moduleId, orderedIds },
                { onError: (e: Error) => toast.error(e.message) },
              )
            }
            onReorderTopics={(subjectId, orderedIds) =>
              mut.reorderTopics.mutate(
                { parentId: subjectId, orderedIds },
                { onError: (e: Error) => toast.error(e.message) },
              )
            }
            onNewSubject={(moduleId) => setView({ kind: 'new-subject', moduleId })}
            onNewTopic={(subjectId) => setView({ kind: 'new-topic', subjectId })}
            canWriteModules={canWriteModules}
          />
        )}
      </Card>

      <Dialog
        open={view !== null}
        onOpenChange={(open) => {
          if (!open) setView(null);
        }}
      >
        <DialogContent>
          <NodeDetail
            view={view}
            tree={tree ?? []}
            canWriteModules={canWriteModules}
            onDone={() => setView(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
