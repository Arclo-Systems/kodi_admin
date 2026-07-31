'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useModulesTree, type TreeModule } from '@/hooks/use-modules-tree';
import { NodeDetail, type TreeView } from '../../node-detail';
import { NodeChrome } from '../../node-shell';

const TREE_PATH = '/content/modules-tree';

// El padre de un nodo existente se deriva del árbol en vez de confiar en la
// query: hoy los formularios solo lo usan al crear, pero dejarlo vacío al editar
// es una trampa para quien lo lea después.
function parentOf(
  tree: TreeModule[],
  kind: 'subject' | 'topic',
  id: string,
): string {
  for (const m of tree) {
    if (kind === 'subject' && m.subjects.some((s) => s.id === id)) return m.id;
    for (const s of m.subjects) {
      if (kind === 'topic' && s.topics.some((t) => t.id === id)) return s.id;
    }
  }
  return '';
}

function toView(
  tree: TreeModule[],
  kind: 'module' | 'subject' | 'topic',
  id: string,
  moduleId?: string,
  subjectId?: string,
): TreeView {
  if (id === 'new') {
    if (kind === 'module') return { kind: 'new-module' };
    if (kind === 'subject') return { kind: 'new-subject', moduleId: moduleId ?? '' };
    return { kind: 'new-topic', subjectId: subjectId ?? '' };
  }
  if (kind === 'module') return { kind: 'module', id };
  if (kind === 'subject') {
    return { kind: 'subject', id, moduleId: moduleId ?? parentOf(tree, 'subject', id) };
  }
  return { kind: 'topic', id, subjectId: subjectId ?? parentOf(tree, 'topic', id) };
}

export function NodeEditorClient({
  kind,
  id,
  moduleId,
  subjectId,
  canWriteModules,
}: {
  kind: 'module' | 'subject' | 'topic';
  id: string;
  moduleId?: string;
  subjectId?: string;
  canWriteModules: boolean;
}) {
  const router = useRouter();
  const { data: tree, isLoading } = useModulesTree();

  // El árbol es la única fuente de datos del panel: no hay GET de detalle por
  // nodo, así que el formulario no puede precargarse hasta que llegue.
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={TREE_PATH}>
          <ArrowLeftIcon className="size-4" />
          Volver al árbol
        </Link>
      </Button>

      {/* Ancho completo: son tres bloques (identidad, configuración y arte) y con
          ancho de modal el arte quedaba apilado abajo con media pantalla vacía. */}
      <Card className="p-6">
        <NodeChrome variant="screen">
          <NodeDetail
            view={toView(tree ?? [], kind, id, moduleId, subjectId)}
            tree={tree ?? []}
            canWriteModules={canWriteModules}
            onDone={() => router.push(TREE_PATH)}
          />
        </NodeChrome>
      </Card>
    </div>
  );
}
