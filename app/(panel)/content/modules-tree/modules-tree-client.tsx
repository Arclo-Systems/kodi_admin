'use client';

import { useRouter } from 'next/navigation';
import { ListTreeIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { useContentTreeMutations } from '@/hooks/use-content-tree-mutations';
import { TreeView, type Selected } from './tree-view';

const TREE_PATH = '/content/modules-tree';

export function ModulesTreeClient({ canWriteModules }: { canWriteModules: boolean }) {
  const router = useRouter();
  const { data: tree, isLoading } = useModulesTree();
  const mut = useContentTreeMutations();

  // Editar y crear pasaron de modal a pantalla propia: el detalle de nodo ya era
  // largo y con la identidad visual (color + dos subidas de imagen con preview)
  // no entraba en un diálogo. Efecto secundario deseado: cada nodo tiene URL.
  const openNode = (kind: 'module' | 'subject' | 'topic', id: string, parent?: string) => {
    const query =
      id === 'new' && parent
        ? `?${kind === 'subject' ? 'moduleId' : 'subjectId'}=${parent}`
        : '';
    router.push(`${TREE_PATH}/${kind}/${id}${query}`);
  };

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <ListTreeIcon className="text-primary size-4" />
          Árbol de contenido
        </h2>
        {canWriteModules && (
          <Button size="sm" variant="outline" onClick={() => openNode('module', 'new')}>
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
          selected={null}
          onSelect={(s: Selected) => {
            if (!s) return;
            openNode(s.type, s.id);
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
          onNewSubject={(moduleId) => openNode('subject', 'new', moduleId)}
          onNewTopic={(subjectId) => openNode('topic', 'new', subjectId)}
          canWriteModules={canWriteModules}
        />
      )}
    </Card>
  );
}
