'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { NodeChrome } from './node-shell';

const TREE_PATH = '/content/modules-tree';

export function ModulesTreeClient({ canWriteModules }: { canWriteModules: boolean }) {
  const router = useRouter();
  const { data: tree, isLoading } = useModulesTree();
  const mut = useContentTreeMutations();
  // Materia y tema siguen en modal: son formularios cortos y entran de sobra.
  // Solo el módulo se fue a pantalla propia, donde el arte necesita el ancho.
  const [view, setView] = useState<ViewState>(null);

  const openModule = (id: string) => router.push(`${TREE_PATH}/module/${id}`);

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <ListTreeIcon className="text-primary size-4" />
            Árbol de contenido
          </h2>
          {canWriteModules && (
            <Button size="sm" variant="outline" onClick={() => openModule('new')}>
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
            selected={
              view?.kind === 'subject'
                ? { type: 'subject', id: view.id, moduleId: view.moduleId }
                : view?.kind === 'topic'
                  ? { type: 'topic', id: view.id, subjectId: view.subjectId }
                  : null
            }
            onSelect={(s: Selected) => {
              if (!s) return;
              if (s.type === 'module') return openModule(s.id);
              if (s.type === 'subject')
                return setView({ kind: 'subject', id: s.id, moduleId: s.moduleId });
              setView({ kind: 'topic', id: s.id, subjectId: s.subjectId });
            }}
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
          <NodeChrome variant="dialog">
            <NodeDetail
              view={view}
              tree={tree ?? []}
              canWriteModules={canWriteModules}
              onDone={() => setView(null)}
            />
          </NodeChrome>
        </DialogContent>
      </Dialog>
    </div>
  );
}
